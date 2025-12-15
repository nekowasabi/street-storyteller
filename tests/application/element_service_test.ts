import { assertEquals, assertExists } from "@std/assert";
import { ElementService } from "../../src/application/element_service.ts";
import { createPluginRegistry } from "../../src/core/plugin_system.ts";
import { CharacterPlugin } from "../../src/plugins/core/character/plugin.ts";
import { DetailsPlugin } from "../../src/plugins/features/details/plugin.ts";

Deno.test("ElementService - プラグインレジストリを使って初期化できる", () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  const service = new ElementService(registry);

  assertExists(service);
});

Deno.test("ElementService - Character要素を作成できる", async () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  const service = new ElementService(registry);

  const result = await service.createElement("character", {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    summary: "勇者の概要",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.filePath);
    assertExists(result.value.content);
    assertEquals(result.value.content.includes("勇者"), true);
  }
});

Deno.test("ElementService - 存在しない要素タイプでエラーを返す", async () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());

  const service = new ElementService(registry);

  const result = await service.createElement("unknown_type", {
    id: "test",
    name: "テスト",
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
    assertEquals(result.error.message.includes("not found"), true);
  }
});

Deno.test("ElementService - Character要素に詳細を追加できる", async () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  const service = new ElementService(registry);

  const baseCharacter = {
    id: "hero",
    name: "勇者",
    role: "protagonist" as const,
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await service.addDetailsToElement("character", baseCharacter, [
    "appearance",
    "backstory",
  ]);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.details);
    assertExists(result.value.details.appearance);
    assertExists(result.value.details.backstory);
  }
});

Deno.test("ElementService - DetailsPluginが登録されていない場合エラーを返す", async () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  // DetailsPluginは登録しない

  const service = new ElementService(registry);

  const baseCharacter = {
    id: "hero",
    name: "勇者",
    role: "protagonist" as const,
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const result = await service.addDetailsToElement("character", baseCharacter, [
    "appearance",
  ]);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
    assertEquals(result.error.message.includes("DetailsPlugin"), true);
  }
});

Deno.test("ElementService - 要素タイプのプラグイン一覧を取得できる", () => {
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());

  const service = new ElementService(registry);

  const elementTypes = service.getAvailableElementTypes();

  assertExists(elementTypes);
  assertEquals(Array.isArray(elementTypes), true);
  assertEquals(elementTypes.includes("character"), true);
});

Deno.test("ElementService - 特定の要素タイププラグインを取得できる", () => {
  const registry = createPluginRegistry();
  const characterPlugin = new CharacterPlugin();
  registry.register(characterPlugin);

  const service = new ElementService(registry);

  const plugin = service.getElementPlugin("character");

  assertExists(plugin);
  assertEquals(plugin.elementType, "character");
});
