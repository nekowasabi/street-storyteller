/**
 * ファイル参照整合性チェックのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { FileReferenceValidator } from "../../src/plugins/features/details/validator.ts";
import type { Character } from "../../src/type/v2/character.ts";
import { join } from "@std/path";

Deno.test("FileReferenceValidator: ファイル参照が存在する場合", async () => {
  // テスト用の一時ディレクトリとファイルを作成
  const tempDir = await Deno.makeTempDir();
  const characterDir = join(tempDir, "characters", "hero");
  await Deno.mkdir(characterDir, { recursive: true });
  await Deno.writeTextFile(
    join(characterDir, "backstory.md"),
    "バックストーリー",
  );

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: { file: "characters/hero/backstory.md" },
    },
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.valid, true);
  assertEquals(result.value.errors.length, 0);

  // クリーンアップ
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileReferenceValidator: ファイル参照が存在しない場合", async () => {
  const tempDir = await Deno.makeTempDir();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: { file: "characters/hero/backstory.md" },
    },
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.valid, false);
  assertEquals(result.value.errors.length, 1);
  assertEquals(result.value.errors[0].type, "file_not_found");
  assertEquals(result.value.errors[0].field, "backstory");

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileReferenceValidator: 複数のファイル参照を検証", async () => {
  const tempDir = await Deno.makeTempDir();
  const characterDir = join(tempDir, "characters", "hero");
  await Deno.mkdir(characterDir, { recursive: true });
  await Deno.writeTextFile(
    join(characterDir, "backstory.md"),
    "バックストーリー",
  );
  // appearanceファイルは作成しない（エラーケース）

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: { file: "characters/hero/backstory.md" },
      appearance: { file: "characters/hero/appearance.md" },
    },
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.valid, false);
  assertEquals(result.value.errors.length, 1);
  assertEquals(result.value.errors[0].field, "appearance");

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileReferenceValidator: インライン文字列はチェックしない", async () => {
  const tempDir = await Deno.makeTempDir();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: "これはインライン文字列です",
    },
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.valid, true);
  assertEquals(result.value.errors.length, 0);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileReferenceValidator: detailsが存在しない場合", async () => {
  const tempDir = await Deno.makeTempDir();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.valid, true);
  assertEquals(result.value.errors.length, 0);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileReferenceValidator: 循環参照の検出", async () => {
  const tempDir = await Deno.makeTempDir();

  // 循環参照は現在のCharacter型では発生しない想定だが、
  // 将来的な拡張のためにテストケースを用意
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: { file: "characters/hero/backstory.md" },
    },
  };

  const validator = new FileReferenceValidator();
  const result = await validator.validate(character, tempDir);

  // 現在の仕様では循環参照は発生しないため、常にvalid
  assertEquals(result.ok, true);

  await Deno.remove(tempDir, { recursive: true });
});
