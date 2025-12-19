/**
 * phase_createツールのテスト
 * TDD Red-Green-Refactor サイクルに従って作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { phaseCreateTool } from "@storyteller/mcp/tools/definitions/phase_create.ts";

Deno.test("phaseCreateTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(phaseCreateTool);
  assertEquals(phaseCreateTool.name, "phase_create");
  assertExists(phaseCreateTool.description);
  assertExists(phaseCreateTool.inputSchema);
  assertExists(phaseCreateTool.execute);
});

Deno.test("phaseCreateTool: inputSchemaが正しく定義されている", () => {
  const schema = phaseCreateTool.inputSchema;

  assertEquals(schema.type, "object");
  assertExists(schema.properties);
  assertExists(schema.required);

  // 必須フィールドの確認
  assertEquals(schema.required.includes("character"), true);
  assertEquals(schema.required.includes("id"), true);
  assertEquals(schema.required.includes("name"), true);
  assertEquals(schema.required.includes("order"), true);
  assertEquals(schema.required.includes("summary"), true);

  // characterプロパティの確認
  assertExists(schema.properties.character);
  assertEquals(schema.properties.character.type, "string");

  // idプロパティの確認
  assertExists(schema.properties.id);
  assertEquals(schema.properties.id.type, "string");

  // nameプロパティの確認
  assertExists(schema.properties.name);
  assertEquals(schema.properties.name.type, "string");

  // orderプロパティの確認
  assertExists(schema.properties.order);
  assertEquals(schema.properties.order.type, "number");

  // summaryプロパティの確認
  assertExists(schema.properties.summary);
  assertEquals(schema.properties.summary.type, "string");

  // transitionTypeプロパティの確認
  assertExists(schema.properties.transitionType);
  assertEquals(schema.properties.transitionType.type, "string");

  // delta関連プロパティの確認（フラット化されている）
  assertExists(schema.properties.addTraits);
  assertEquals(schema.properties.addTraits.type, "array");
  assertExists(schema.properties.removeTraits);
  assertEquals(schema.properties.removeTraits.type, "array");
});

Deno.test("phaseCreateTool: descriptionが日本語で記述されている", () => {
  assertExists(phaseCreateTool.description);
  // 日本語を含むことを確認
  assertEquals(
    phaseCreateTool.description.includes("フェーズ") ||
      phaseCreateTool.description.includes("成長") ||
      phaseCreateTool.description.includes("キャラクター"),
    true,
  );
});

Deno.test("phaseCreateTool: execute関数が定義されている", () => {
  assertEquals(typeof phaseCreateTool.execute, "function");
});

Deno.test("phaseCreateTool: 必須パラメータなしでエラーを返す", async () => {
  const result = await phaseCreateTool.execute({});

  assertEquals(result.isError, true);
  assertEquals(result.content[0].type, "text");
});

Deno.test("phaseCreateTool: characterのみ指定でエラーを返す", async () => {
  const result = await phaseCreateTool.execute({ character: "hero" });

  assertEquals(result.isError, true);
});

Deno.test("phaseCreateTool: 無効なtransitionTypeでエラーを返す", async () => {
  const result = await phaseCreateTool.execute({
    character: "hero",
    id: "awakening",
    name: "覚醒期",
    order: 1,
    summary: "覚醒する",
    transitionType: "invalid_type",
  });

  assertEquals(result.isError, true);
});
