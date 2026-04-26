/**
 * SubplotPlugin テスト（TDD Red Phase）
 *
 * SubplotPluginがElementPluginインターフェースを正しく実装していることを検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { SubplotPlugin } from "@storyteller/plugins/core/subplot/plugin.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

Deno.test("SubplotPlugin", async (t) => {
  const plugin = new SubplotPlugin();

  await t.step(
    "PluginMetadata id が storyteller.element.subplot であること",
    () => {
      assertExists(plugin.meta);
      assertEquals(plugin.meta.id, "storyteller.element.subplot");
    },
  );

  await t.step("elementType が subplot であること", () => {
    assertEquals(plugin.elementType, "subplot");
  });

  await t.step("getElementPath() が正しいファイルパスを返すこと", () => {
    const path = plugin.getElementPath("prince_story", "/project");
    assertEquals(path, "/project/src/subplots/prince_story.ts");
  });

  await t.step("getDetailsDir() が正しい詳細ディレクトリパスを返すこと", () => {
    const dir = plugin.getDetailsDir("prince_story", "/project");
    assertEquals(dir, "/project/src/subplots/prince_story/details");
  });

  await t.step(
    "createElementFile() でサブプロットファイルを生成できること",
    async () => {
      const subplot: Subplot = {
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        status: "active",
        summary: "王子が運命の人を探す物語",
        beats: [],
        focusCharacters: { prince: "primary" as const },
      };

      const result = await plugin.createElementFile(subplot);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(
          result.value.filePath,
          "src/subplots/prince_story.ts",
        );
        // 生成されたコンテンツにSubplot型インポートが含まれること
        assertEquals(
          result.value.content.includes("import type { Subplot }"),
          true,
        );
        // エクスポートが含まれること
        assertEquals(
          result.value.content.includes("export const prince_story"),
          true,
        );
      }
    },
  );

  await t.step(
    "createElementFile() が必須フィールド欠落時にエラーを返すこと",
    async () => {
      const invalidSubplot = {
        id: "invalid",
        // name, type, summary, beats, focusCharacters が欠落
      };

      const result = await plugin.createElementFile(invalidSubplot);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(
          result.error.message.includes("Missing required fields"),
          true,
        );
      }
    },
  );

  await t.step(
    "validateElement() がSubplot整合性チェックできること",
    () => {
      const validSubplot: Subplot = {
        id: "valid_subplot",
        name: "有効なサブプロット",
        type: "subplot",
        status: "active",
        summary: "有効な概要",
        beats: [],
        focusCharacters: { hero: "primary" as const },
      };

      const result = plugin.validateElement(validSubplot);
      assertEquals(result.valid, true);
    },
  );

  await t.step("validateElement() が無効なSubplot検出できること", () => {
    const invalidSubplot = {
      id: "",
      name: "無効なサブプロット",
    };

    const result = plugin.validateElement(invalidSubplot);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    assertEquals(result.errors.length > 0, true);
  });

  await t.step(
    "exportElementSchema() がSubplot型スキーマを返すこと",
    () => {
      const schema = plugin.exportElementSchema();

      assertEquals(schema.type, "subplot");
      assertExists(schema.properties.id);
      assertExists(schema.properties.name);
      assertExists(schema.properties.type);
      assertExists(schema.properties.summary);
      assertExists(schema.properties.beats);
      assertExists(schema.properties.focusCharacters);
      assertEquals(schema.required?.includes("id"), true);
      assertEquals(schema.required?.includes("name"), true);
      assertEquals(schema.required?.includes("type"), true);
      assertEquals(schema.required?.includes("summary"), true);
      assertEquals(schema.required?.includes("beats"), true);
      assertEquals(schema.required?.includes("focusCharacters"), true);
    },
  );
});
