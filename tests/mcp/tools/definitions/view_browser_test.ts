/**
 * view_browserツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { viewBrowserTool } from "@storyteller/mcp/tools/definitions/view_browser.ts";

Deno.test("viewBrowserTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(viewBrowserTool);
  assertEquals(viewBrowserTool.name, "view_browser");
  assertExists(viewBrowserTool.inputSchema);
  assertExists(viewBrowserTool.execute);
});

Deno.test("viewBrowserTool: inputSchemaが正しく定義されている", () => {
  const schema = viewBrowserTool.inputSchema;
  assertEquals(schema.type, "object");
  assertExists(schema.properties);
  assertExists(schema.properties.path);
  assertEquals(schema.properties.path.type, "string");
  assertExists(schema.properties.port);
  assertEquals(schema.properties.port.type, "number");
  assertExists(schema.properties.dryRun);
  assertEquals(schema.properties.dryRun.type, "boolean");
});

Deno.test("viewBrowserTool: dry-runモードで正常動作する（サーバー起動しない）", async () => {
  const result = await viewBrowserTool.execute({
    path: Deno.cwd(),
    port: 3999,
    dryRun: true,
    serve: true,
  });

  assertExists(result);
  assertEquals(result.isError, false);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  assertEquals(text.includes("dry-run"), true);
});
