import { assertEquals, assertExists } from "@std/assert";
import { CharacterPlugin } from "@storyteller/plugins/core/character/plugin.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

Deno.test("CharacterPlugin - メタデータが正しい", () => {
  const plugin = new CharacterPlugin();

  assertEquals(plugin.meta.id, "storyteller.element.character");
  assertEquals(plugin.elementType, "character");
  assertExists(plugin.meta.version);
});

Deno.test("CharacterPlugin - 基本的なCharacter要素を作成できる", async () => {
  const plugin = new CharacterPlugin();

  const result = await plugin.createElementFile({
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    summary: "世界を救う運命を背負った若者",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.filePath);
    assertExists(result.value.content);
    // TypeScriptファイルの内容にCharacter型が含まれているか確認
    assertEquals(result.value.content.includes("Character"), true);
    assertEquals(result.value.content.includes("勇者"), true);
  }
});

Deno.test("CharacterPlugin - 詳細情報付きCharacter要素を作成できる", async () => {
  const plugin = new CharacterPlugin();

  const result = await plugin.createElementFile({
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    summary: "勇者の概要",
    details: {
      appearance: "金髪の青年",
      personality: "正義感が強い",
    },
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.content.includes("appearance"), true);
    assertEquals(result.value.content.includes("金髪の青年"), true);
  }
});

Deno.test("CharacterPlugin - 無効なCharacterを検証できる", () => {
  const plugin = new CharacterPlugin();

  // nameが空の無効なCharacter
  const invalidChar = {
    id: "test",
    name: "",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "テスト",
  };

  const result = plugin.validateElement(invalidChar);

  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors!.length > 0, true);
});

Deno.test("CharacterPlugin - 有効なCharacterを検証できる", () => {
  const plugin = new CharacterPlugin();

  const validChar: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = plugin.validateElement(validChar);

  assertEquals(result.valid, true);
  assertEquals(result.errors, undefined);
});

Deno.test("CharacterPlugin - TypeSchemaをエクスポートできる", () => {
  const plugin = new CharacterPlugin();

  const schema = plugin.exportElementSchema();

  assertExists(schema);
  assertEquals(schema.type, "character");
  assertExists(schema.properties);
  // 必須プロパティの確認
  assertEquals("id" in schema.properties, true);
  assertEquals("name" in schema.properties, true);
  assertEquals("role" in schema.properties, true);
});

Deno.test("CharacterPlugin - 要素のパスを取得できる", () => {
  const plugin = new CharacterPlugin();

  const path = plugin.getElementPath("hero", "/project");

  assertEquals(path.includes("characters"), true);
  assertEquals(path.includes("hero"), true);
  assertEquals(path.endsWith(".ts"), true);
});

Deno.test("CharacterPlugin - 詳細ディレクトリのパスを取得できる", () => {
  const plugin = new CharacterPlugin();

  const path = plugin.getDetailsDir("hero", "/project");

  assertEquals(path.includes("characters"), true);
  assertEquals(path.includes("hero"), true);
  assertEquals(path.includes("details"), true);
});
