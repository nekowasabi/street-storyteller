/**
 * SettingPlugin tests
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { SettingPlugin } from "@storyteller/plugins/core/setting/plugin.ts";

Deno.test("SettingPlugin: メタデータが正しく設定されている", () => {
  const plugin = new SettingPlugin();
  assertEquals(plugin.meta.id, "storyteller.element.setting");
  assertEquals(plugin.elementType, "setting");
  assertExists(plugin.meta.version);
  assertExists(plugin.meta.name);
});

Deno.test("SettingPlugin: exportElementSchemaが正しい型スキーマを返す", () => {
  const plugin = new SettingPlugin();
  const schema = plugin.exportElementSchema();

  assertEquals(schema.type, "setting");
  assertExists(schema.properties.id);
  assertExists(schema.properties.name);
  assertExists(schema.properties.type);
  assertExists(schema.properties.summary);
  assertExists(schema.properties.appearingChapters);
  assertEquals(schema.required?.includes("id"), true);
  assertEquals(schema.required?.includes("name"), true);
  assertEquals(schema.required?.includes("type"), true);
  assertEquals(schema.required?.includes("summary"), true);
});

Deno.test("SettingPlugin: createElementFileが正しいファイルパスを生成する", async () => {
  const plugin = new SettingPlugin();
  const result = await plugin.createElementFile({
    id: "royal_capital",
    name: "王都",
    type: "location",
    summary: "王国の中心地",
    appearingChapters: [],
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.filePath, "src/settings/royal_capital.ts");
    assertEquals(result.value.content.includes("王都"), true);
    assertEquals(result.value.content.includes("Setting"), true);
  }
});

Deno.test("SettingPlugin: 必須フィールド不足でエラー", async () => {
  const plugin = new SettingPlugin();
  const result = await plugin.createElementFile({
    id: "test",
    name: "テスト",
    // type と summary が不足
  });

  assertEquals(result.ok, false);
});

Deno.test("SettingPlugin: getElementPathが正しいパスを返す", () => {
  const plugin = new SettingPlugin();
  const path = plugin.getElementPath("royal_capital", "/project");
  assertEquals(path, "/project/src/settings/royal_capital.ts");
});

Deno.test("SettingPlugin: getDetailsDirが正しいパスを返す", () => {
  const plugin = new SettingPlugin();
  const path = plugin.getDetailsDir("royal_capital", "/project");
  assertEquals(path, "/project/src/settings/royal_capital/details");
});
