/**
 * ファイル分離ワークフローの統合テスト
 *
 * インライン作成 → ファイル分離 → 整合性検証の全フローをテスト
 */

import { assertEquals } from "@std/assert";
import { DetailsPlugin } from "../../src/plugins/features/details/plugin.ts";
import { FileReferenceValidator } from "../../src/plugins/features/details/validator.ts";
import type { Character } from "../../src/type/v2/character.ts";
import { join } from "@std/path";

Deno.test("統合テスト: インライン作成 → ファイル分離 → 検証", async () => {
  const tempDir = await Deno.makeTempDir();

  // ========================================
  // フェーズ1: インラインでCharacterを作成
  // ========================================
  const detailsPlugin = new DetailsPlugin();

  let character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "strong"],
    relationships: {},
    appearingChapters: [],
    summary: "世界を救う勇者",
  };

  // 詳細情報をインラインで追加
  const addDetailsResult = await detailsPlugin.addDetails(character, [
    "backstory",
    "appearance",
    "personality",
  ]);

  assertEquals(addDetailsResult.ok, true);
  if (!addDetailsResult.ok) return;

  character = addDetailsResult.value;

  // インライン詳細が追加されていることを確認
  assertEquals(typeof character.details?.backstory, "string");
  assertEquals(typeof character.details?.appearance, "string");
  assertEquals(typeof character.details?.personality, "string");

  // ========================================
  // フェーズ2: 詳細情報をファイルに分離
  // ========================================
  const separateResult = await detailsPlugin.separateFiles(
    character,
    ["backstory", "appearance"],
    tempDir,
  );

  assertEquals(separateResult.ok, true);
  if (!separateResult.ok) return;

  const updatedCharacter = separateResult.value.character;

  // backstoryとappearanceがファイル参照に変換されていることを確認
  assertEquals(typeof updatedCharacter.details?.backstory, "object");
  assertEquals((updatedCharacter.details?.backstory as any).file, "characters/hero/backstory.md");

  assertEquals(typeof updatedCharacter.details?.appearance, "object");
  assertEquals((updatedCharacter.details?.appearance as any).file, "characters/hero/appearance.md");

  // personalityはインラインのまま
  assertEquals(typeof updatedCharacter.details?.personality, "string");

  // ファイルを実際に作成
  for (const fileInfo of separateResult.value.filesToCreate) {
    const fullPath = join(tempDir, fileInfo.path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, fileInfo.content);
  }

  // ========================================
  // フェーズ3: ファイル参照の整合性を検証
  // ========================================
  const validator = new FileReferenceValidator();
  const validationResult = await validator.validate(updatedCharacter, tempDir);

  assertEquals(validationResult.ok, true);
  if (!validationResult.ok) return;

  // 全てのファイル参照が有効であることを確認
  assertEquals(validationResult.value.valid, true);
  assertEquals(validationResult.value.errors.length, 0);

  // ========================================
  // フェーズ4: 作成されたMarkdownファイルの内容を検証
  // ========================================
  const backstoryContent = await Deno.readTextFile(
    join(tempDir, "characters/hero/backstory.md"),
  );
  assertEquals(backstoryContent.includes("type: character-detail"), true);
  assertEquals(backstoryContent.includes("field: backstory"), true);
  assertEquals(backstoryContent.includes("characterId: hero"), true);
  assertEquals(backstoryContent.includes("characterName: 勇者"), true);

  const appearanceContent = await Deno.readTextFile(
    join(tempDir, "characters/hero/appearance.md"),
  );
  assertEquals(appearanceContent.includes("field: appearance"), true);

  // クリーンアップ
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("統合テスト: 'all'指定でのファイル分離と検証", async () => {
  const tempDir = await Deno.makeTempDir();

  const detailsPlugin = new DetailsPlugin();

  let character: Character = {
    id: "villain",
    name: "魔王",
    role: "antagonist",
    traits: ["evil", "powerful"],
    relationships: {},
    appearingChapters: [],
    summary: "世界を支配しようとする魔王",
  };

  // すべての詳細情報を追加
  const addDetailsResult = await detailsPlugin.addDetails(character, [
    "backstory",
    "appearance",
    "personality",
    "goals",
  ]);

  assertEquals(addDetailsResult.ok, true);
  if (!addDetailsResult.ok) return;

  character = addDetailsResult.value;

  // 'all'でファイル分離
  const separateResult = await detailsPlugin.separateFiles(character, "all", tempDir);

  assertEquals(separateResult.ok, true);
  if (!separateResult.ok) return;

  const updatedCharacter = separateResult.value.character;

  // すべてのフィールドがファイル参照に変換されている
  assertEquals(typeof updatedCharacter.details?.backstory, "object");
  assertEquals(typeof updatedCharacter.details?.appearance, "object");
  assertEquals(typeof updatedCharacter.details?.personality, "object");
  assertEquals(typeof updatedCharacter.details?.goals, "object");

  // ファイルを作成
  for (const fileInfo of separateResult.value.filesToCreate) {
    const fullPath = join(tempDir, fileInfo.path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, fileInfo.content);
  }

  // 検証
  const validator = new FileReferenceValidator();
  const validationResult = await validator.validate(updatedCharacter, tempDir);

  assertEquals(validationResult.ok, true);
  if (!validationResult.ok) return;

  assertEquals(validationResult.value.valid, true);
  assertEquals(validationResult.value.errors.length, 0);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("統合テスト: ファイル不在時の検証エラー検出", async () => {
  const tempDir = await Deno.makeTempDir();

  const detailsPlugin = new DetailsPlugin();

  let character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
  };

  const addDetailsResult = await detailsPlugin.addDetails(character, ["backstory"]);
  assertEquals(addDetailsResult.ok, true);
  if (!addDetailsResult.ok) return;

  character = addDetailsResult.value;

  const separateResult = await detailsPlugin.separateFiles(character, ["backstory"], tempDir);
  assertEquals(separateResult.ok, true);
  if (!separateResult.ok) return;

  const updatedCharacter = separateResult.value.character;

  // ファイルを作成しない（意図的にエラーケースを作る）

  // 検証
  const validator = new FileReferenceValidator();
  const validationResult = await validator.validate(updatedCharacter, tempDir);

  assertEquals(validationResult.ok, true);
  if (!validationResult.ok) return;

  // ファイルが存在しないためエラーが検出される
  assertEquals(validationResult.value.valid, false);
  assertEquals(validationResult.value.errors.length, 1);
  assertEquals(validationResult.value.errors[0].type, "file_not_found");
  assertEquals(validationResult.value.errors[0].field, "backstory");

  await Deno.remove(tempDir, { recursive: true });
});
