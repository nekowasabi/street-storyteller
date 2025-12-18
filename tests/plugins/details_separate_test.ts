/**
 * DetailsPlugin ファイル分離機能のテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { DetailsPlugin } from "../../src/plugins/features/details/plugin.ts";
import type { Character } from "../../src/type/v2/character.ts";

Deno.test("DetailsPlugin - separateFiles: backstoryをファイル参照に変換", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    relationships: {},
    appearingChapters: [],
    summary: "勇者の物語",
    details: {
      backstory:
        "これはインラインのバックストーリーです。\n彼は村で育ちました。",
    },
  };

  const result = await plugin.separateFiles(
    character,
    ["backstory"],
    "/tmp/test-project",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;

  const updated = result.value.character;
  assertExists(updated.details);
  assertEquals(typeof updated.details.backstory, "object");
  assertEquals(
    (updated.details.backstory as { file: string }).file,
    "characters/hero/backstory.md",
  );

  // 生成されるファイルの確認
  assertEquals(result.value.filesToCreate.length, 1);
  assertEquals(
    result.value.filesToCreate[0].path,
    "characters/hero/backstory.md",
  );
  assertEquals(
    result.value.filesToCreate[0].content.includes(
      "これはインラインのバックストーリーです",
    ),
    true,
  );
});

Deno.test("DetailsPlugin - separateFiles: 複数フィールドを同時に分離", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: "バックストーリー",
      appearance: "外見の詳細",
      personality: "性格の詳細",
    },
  };

  const result = await plugin.separateFiles(
    character,
    ["backstory", "appearance", "personality"],
    "/tmp/test",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;

  assertEquals(result.value.filesToCreate.length, 3);
  assertEquals(typeof result.value.character.details?.backstory, "object");
  assertEquals(typeof result.value.character.details?.appearance, "object");
  assertEquals(typeof result.value.character.details?.personality, "object");
});

Deno.test("DetailsPlugin - separateFiles: 既にファイル参照の場合はスキップ", async () => {
  const plugin = new DetailsPlugin();

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

  const result = await plugin.separateFiles(
    character,
    ["backstory"],
    "/tmp/test",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // ファイル生成はされない
  assertEquals(result.value.filesToCreate.length, 0);
  assertEquals(result.value.character.details?.backstory, {
    file: "characters/hero/backstory.md",
  });
});

Deno.test("DetailsPlugin - separateFiles: 存在しないフィールドの場合はエラー", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
  };

  const result = await plugin.separateFiles(
    character,
    ["backstory"],
    "/tmp/test",
  );

  assertEquals(result.ok, false);
  if (result.ok) return;

  assertEquals(result.error.message.includes("backstory"), true);
});

Deno.test("DetailsPlugin - separateFiles: 無効なフィールド名の場合はエラー", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: "内容",
    },
  };

  const result = await plugin.separateFiles(
    character,
    ["invalid_field" as any],
    "/tmp/test",
  );

  assertEquals(result.ok, false);
});

Deno.test("DetailsPlugin - separateFiles: 'all'で全フィールドを分離", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "概要",
    details: {
      backstory: "バックストーリー",
      appearance: "外見",
      personality: "性格",
    },
  };

  const result = await plugin.separateFiles(character, "all", "/tmp/test");

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // 文字列フィールド3つが分離される
  assertEquals(result.value.filesToCreate.length, 3);
});

Deno.test("DetailsPlugin - separateFiles: descriptionをファイル参照に変換", async () => {
  const plugin = new DetailsPlugin();

  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    relationships: {},
    appearingChapters: [],
    summary: "勇者の概要",
    details: {
      description:
        "これはdescriptionフィールドの詳細説明です。\nsummaryよりも長い詳細情報を記載します。",
    },
  };

  const result = await plugin.separateFiles(
    character,
    ["description"],
    "/tmp/test-project",
  );

  assertEquals(result.ok, true);
  if (!result.ok) return;

  const updated = result.value.character;
  assertExists(updated.details);
  assertEquals(typeof updated.details.description, "object");
  assertEquals(
    (updated.details.description as { file: string }).file,
    "characters/hero/description.md",
  );

  // 生成されるファイルの確認
  assertEquals(result.value.filesToCreate.length, 1);
  assertEquals(
    result.value.filesToCreate[0].path,
    "characters/hero/description.md",
  );
  assertEquals(
    result.value.filesToCreate[0].content.includes(
      "これはdescriptionフィールドの詳細説明です",
    ),
    true,
  );
});
