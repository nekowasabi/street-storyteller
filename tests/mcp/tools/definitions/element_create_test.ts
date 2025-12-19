/**
 * element_createツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { elementCreateTool } from "@storyteller/mcp/tools/definitions/element_create.ts";

function extractToolResultJson(
  result: unknown,
): Record<string, unknown> {
  const record = result as { content?: ReadonlyArray<{ text?: unknown }> };
  const text = record.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("tool output missing text");
  }
  const marker = "Result:\n";
  const index = text.lastIndexOf(marker);
  if (index === -1) {
    throw new Error("tool output missing Result marker");
  }
  const jsonText = text.slice(index + marker.length).trim();
  return JSON.parse(jsonText) as Record<string, unknown>;
}

Deno.test("elementCreateTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(elementCreateTool);
  assertEquals(elementCreateTool.name, "element_create");
  assertExists(elementCreateTool.description);
  assertExists(elementCreateTool.inputSchema);
  assertExists(elementCreateTool.execute);
});

Deno.test("elementCreateTool: inputSchemaが正しく定義されている", () => {
  const schema = elementCreateTool.inputSchema;
  assertEquals(schema.type, "object");
  assertExists(schema.properties);
  assertExists(schema.properties.type);
  assertEquals(schema.properties.type.type, "string");
  assertExists(schema.properties.name);
  assertEquals(schema.properties.name.type, "string");
});

Deno.test("elementCreateTool: 必須パラメータ不足でエラーを返す", async () => {
  const result = await elementCreateTool.execute({});
  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("elementCreateTool: 空のnameはエラー", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "   ",
  });
  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("elementCreateTool: 未対応typeはエラー", async () => {
  const result = await elementCreateTool.execute({ type: "plot", name: "x" });
  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("elementCreateTool: setting typeはsettingType必須", async () => {
  const result = await elementCreateTool.execute({
    type: "setting",
    name: "city",
  });
  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("elementCreateTool: setting typeで正常実行できる", async () => {
  const result = await elementCreateTool.execute({
    type: "setting",
    name: "royal_capital",
    settingType: "location",
    summary: "王国の中心地",
  });
  assertExists(result);
  assertEquals(result.isError, false);
  assertEquals(result.content.length > 0, true);
});

Deno.test("elementCreateTool: setting typeでdisplayNamesを配列で渡せる", async () => {
  const result = await elementCreateTool.execute({
    type: "setting",
    name: "royal_capital",
    settingType: "location",
    summary: "王国の中心地",
    displayNames: ["王都", "首都"],
  });
  assertEquals(result.isError, false);

  const json = extractToolResultJson(result);
  assertEquals(json.filePath, "src/settings/royal_capital.ts");
  const content = json.content;
  assertEquals(typeof content, "string");
  if (typeof content === "string") {
    // displayNamesが含まれていること
    assertEquals(content.includes("displayNames:"), true);
    assertEquals(content.includes('"王都"'), true);
    assertEquals(content.includes('"首都"'), true);
  }
});

Deno.test("elementCreateTool: character typeはrole必須", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
  });
  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("elementCreateTool: character typeで正常実行できる", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
    role: "protagonist",
    summary: "勇者の概要",
  });
  assertExists(result);
  assertEquals(result.isError, false);
  assertEquals(result.content.length > 0, true);
});

Deno.test("elementCreateTool: traits配列はCSVとして渡され、TSに反映される", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
    role: "protagonist",
    traits: [" brave ", 1, "kind", "", "  "],
  });
  assertEquals(result.isError, false);

  const json = extractToolResultJson(result);
  assertEquals(json.filePath, "src/characters/hero.ts");
  const content = json.content;
  assertEquals(typeof content, "string");
  if (typeof content === "string") {
    // traitsが含まれていること
    assertEquals(content.includes("traits:"), true);
    assertEquals(content.includes('"brave"'), true);
    assertEquals(content.includes('"kind"'), true);
  }
});

Deno.test("elementCreateTool: traits文字列はそのまま渡される", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
    role: "protagonist",
    traits: "brave,kind",
  });
  assertEquals(result.isError, false);
  const json = extractToolResultJson(result);
  const content = json.content;
  assertEquals(typeof content, "string");
  if (typeof content === "string") {
    // traitsが含まれていること
    assertEquals(content.includes("traits:"), true);
    assertEquals(content.includes('"brave"'), true);
    assertEquals(content.includes('"kind"'), true);
  }
});

Deno.test("elementCreateTool: withDetailsはdetailsを生成する", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
    role: "protagonist",
    withDetails: true,
  });
  assertEquals(result.isError, false);
  const json = extractToolResultJson(result);
  const content = json.content;
  assertEquals(typeof content, "string");
  if (typeof content === "string") {
    // detailsセクションが含まれていること
    assertEquals(content.includes("details:"), true);
  }
});

Deno.test("elementCreateTool: addDetailsは指定フィールドのdetailsを生成する", async () => {
  const result = await elementCreateTool.execute({
    type: "character",
    name: "hero",
    role: "protagonist",
    addDetails: "appearance,backstory",
  });
  assertEquals(result.isError, false);
  const json = extractToolResultJson(result);
  const content = json.content;
  assertEquals(typeof content, "string");
  if (typeof content === "string") {
    // detailsセクションが含まれていること
    assertEquals(content.includes("details:"), true);
  }
});
