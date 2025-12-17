/**
 * phase_viewツールのテスト
 * TDD Red-Green-Refactor サイクルに従って作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { phaseViewTool } from "../../../../src/mcp/tools/definitions/phase_view.ts";

Deno.test("phaseViewTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(phaseViewTool);
  assertEquals(phaseViewTool.name, "phase_view");
  assertExists(phaseViewTool.description);
  assertExists(phaseViewTool.inputSchema);
  assertExists(phaseViewTool.execute);
});

Deno.test("phaseViewTool: inputSchemaが正しく定義されている", () => {
  const schema = phaseViewTool.inputSchema;

  assertEquals(schema.type, "object");
  assertExists(schema.properties);
  assertExists(schema.required);

  // 必須フィールドの確認
  assertEquals(schema.required.includes("character"), true);

  // characterプロパティの確認
  assertExists(schema.properties.character);
  assertEquals(schema.properties.character.type, "string");

  // phaseIdプロパティの確認（オプショナル）
  assertExists(schema.properties.phaseId);
  assertEquals(schema.properties.phaseId.type, "string");

  // formatプロパティの確認
  assertExists(schema.properties.format);
  assertEquals(schema.properties.format.type, "string");
});

Deno.test("phaseViewTool: descriptionが日本語で記述されている", () => {
  assertExists(phaseViewTool.description);
  // 日本語を含むことを確認
  assertEquals(
    phaseViewTool.description.includes("フェーズ") ||
      phaseViewTool.description.includes("表示") ||
      phaseViewTool.description.includes("キャラクター"),
    true,
  );
});

Deno.test("phaseViewTool: execute関数が定義されている", () => {
  assertEquals(typeof phaseViewTool.execute, "function");
});

Deno.test("phaseViewTool: 必須パラメータなしでエラーを返す", async () => {
  const result = await phaseViewTool.execute({});

  assertEquals(result.isError, true);
  assertEquals(result.content[0].type, "text");
});
