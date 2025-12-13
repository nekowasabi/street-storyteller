import { assertEquals, assertExists } from "jsr:@std/assert";
import { DetailsPlugin } from "../../src/plugins/features/details/plugin.ts";
import type { Character } from "../../src/type/v2/character.ts";

Deno.test("DetailsPlugin - メタデータが正しい", () => {
  const plugin = new DetailsPlugin();

  assertEquals(plugin.meta.id, "storyteller.feature.details");
  assertEquals(plugin.featureId, "details");
  assertExists(plugin.meta.version);
});

Deno.test("DetailsPlugin - Character要素に詳細スケルトンを追加できる", async () => {
  const plugin = new DetailsPlugin();

  const baseCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await plugin.addDetails(baseCharacter, [
    "appearance",
    "backstory",
  ]);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.details);
    assertExists(result.value.details.appearance);
    assertExists(result.value.details.backstory);
    // スケルトンは空文字列またはテンプレート文字列
    assertEquals(typeof result.value.details.appearance, "string");
    assertEquals(typeof result.value.details.backstory, "string");
  }
});

Deno.test("DetailsPlugin - 既存の詳細情報を保持する", async () => {
  const plugin = new DetailsPlugin();

  const characterWithDetails: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
    details: {
      appearance: "既存の外見情報",
    },
  };

  const result = await plugin.addDetails(characterWithDetails, ["backstory"]);

  assertEquals(result.ok, true);
  if (result.ok) {
    // 既存のappearanceは保持される
    assertEquals(result.value.details?.appearance, "既存の外見情報");
    // 新しいbackstoryが追加される
    assertExists(result.value.details?.backstory);
  }
});

Deno.test("DetailsPlugin - 複数の詳細フィールドを一度に追加できる", async () => {
  const plugin = new DetailsPlugin();

  const baseCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await plugin.addDetails(baseCharacter, [
    "appearance",
    "personality",
    "backstory",
    "development",
  ]);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.details?.appearance);
    assertExists(result.value.details?.personality);
    assertExists(result.value.details?.backstory);
    assertExists(result.value.details?.development);
  }
});

Deno.test("DetailsPlugin - developmentフィールドは構造化オブジェクトとして追加される", async () => {
  const plugin = new DetailsPlugin();

  const baseCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await plugin.addDetails(baseCharacter, ["development"]);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.details?.development);
    assertEquals(typeof result.value.details.development, "object");
    // CharacterDevelopment型の必須フィールドが存在する
    const dev = result.value.details.development;
    assertExists(dev.initial);
    assertExists(dev.goal);
    assertExists(dev.obstacle);
  }
});

Deno.test("DetailsPlugin - 無効なフィールド名でエラーを返す", async () => {
  const plugin = new DetailsPlugin();

  const baseCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await plugin.addDetails(baseCharacter, [
    "invalid_field" as any,
  ]);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
    assertEquals(result.error.message.includes("invalid"), true);
  }
});

Deno.test("DetailsPlugin - 詳細フィールドのテンプレートを取得できる", () => {
  const plugin = new DetailsPlugin();

  const template = plugin.getTemplate("appearance");

  assertExists(template);
  assertEquals(typeof template, "string");
  if (typeof template === "string") {
    assertEquals(template.length > 0, true);
  }
});

Deno.test("DetailsPlugin - 利用可能な詳細フィールド一覧を取得できる", () => {
  const plugin = new DetailsPlugin();

  const fields = plugin.getAvailableFields();

  assertExists(fields);
  assertEquals(Array.isArray(fields), true);
  assertEquals(fields.includes("appearance"), true);
  assertEquals(fields.includes("personality"), true);
  assertEquals(fields.includes("backstory"), true);
  assertEquals(fields.includes("development"), true);
});
