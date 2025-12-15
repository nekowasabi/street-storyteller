/**
 * meta_checkツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { metaCheckTool } from "../../../../src/mcp/tools/definitions/meta_check.ts";

Deno.test("metaCheckTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(metaCheckTool);
  assertEquals(metaCheckTool.name, "meta_check");
  assertExists(metaCheckTool.description);
  assertExists(metaCheckTool.inputSchema);
  assertExists(metaCheckTool.execute);
});

Deno.test("metaCheckTool: inputSchemaが正しく定義されている", () => {
  const schema = metaCheckTool.inputSchema;

  assertEquals(schema.type, "object");
  assertExists(schema.properties);

  // pathプロパティの確認
  assertExists(schema.properties.path);
  assertEquals(schema.properties.path.type, "string");

  // dirプロパティの確認
  assertExists(schema.properties.dir);
  assertEquals(schema.properties.dir.type, "string");

  // recursiveプロパティの確認
  assertExists(schema.properties.recursive);
  assertEquals(schema.properties.recursive.type, "boolean");

  // charactersプロパティの確認
  assertExists(schema.properties.characters);
  assertEquals(schema.properties.characters.type, "string");

  // settingsプロパティの確認
  assertExists(schema.properties.settings);
  assertEquals(schema.properties.settings.type, "string");

  // presetプロパティの確認
  assertExists(schema.properties.preset);
  assertEquals(schema.properties.preset.type, "string");
});

Deno.test("metaCheckTool: descriptionが日本語で記述されている", () => {
  assertExists(metaCheckTool.description);
  // 日本語を含むことを確認
  assertEquals(
    metaCheckTool.description.includes("原稿") ||
      metaCheckTool.description.includes("メタデータ") ||
      metaCheckTool.description.includes("検証"),
    true,
  );
});

Deno.test("metaCheckTool: execute関数が定義されている", () => {
  assertEquals(typeof metaCheckTool.execute, "function");
});

Deno.test("metaCheckTool: 引数なしでエラー結果を返す", async () => {
  const result = await metaCheckTool.execute({});

  assertExists(result);
  assertEquals(result.isError, true);
  assertEquals(result.content.length, 1);
});

Deno.test("metaCheckTool: pathまたはdirが必要であることを示す", async () => {
  const result = await metaCheckTool.execute({});

  assertExists(result);
  assertEquals(result.isError, true);
  const textContent = result.content[0] as { type: "text"; text: string };
  // pathかdirのどちらかが必要というメッセージを含む
  assertEquals(
    textContent.text.includes("path") || textContent.text.includes("dir"),
    true,
  );
});
