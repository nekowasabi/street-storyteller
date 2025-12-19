/**
 * ツールレジストリのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  type McpToolDefinition,
  ToolRegistry,
} from "@storyteller/mcp/tools/tool_registry.ts";

/**
 * テスト用のツール定義を作成
 */
function createTestTool(name: string): McpToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
      },
    },
    execute: async (args) => ({
      content: [{
        type: "text",
        text: `Executed ${name} with ${JSON.stringify(args)}`,
      }],
    }),
  };
}

Deno.test("ToolRegistry: register()でツールを登録できる", () => {
  const registry = new ToolRegistry();
  const tool = createTestTool("test_tool");

  registry.register(tool);

  const retrieved = registry.get("test_tool");
  assertExists(retrieved);
  assertEquals(retrieved.name, "test_tool");
});

Deno.test("ToolRegistry: get()で登録済みツールを取得できる", () => {
  const registry = new ToolRegistry();
  const tool = createTestTool("my_tool");

  registry.register(tool);
  const retrieved = registry.get("my_tool");

  assertExists(retrieved);
  assertEquals(retrieved.name, "my_tool");
  assertEquals(retrieved.description, "Test tool: my_tool");
});

Deno.test("ToolRegistry: get()で未登録ツールはundefinedを返す", () => {
  const registry = new ToolRegistry();

  const retrieved = registry.get("nonexistent_tool");

  assertEquals(retrieved, undefined);
});

Deno.test("ToolRegistry: listTools()で全ツール一覧を取得できる", () => {
  const registry = new ToolRegistry();
  registry.register(createTestTool("tool_a"));
  registry.register(createTestTool("tool_b"));
  registry.register(createTestTool("tool_c"));

  const tools = registry.listTools();

  assertEquals(tools.length, 3);
  const names = tools.map((t) => t.name).sort();
  assertEquals(names, ["tool_a", "tool_b", "tool_c"]);
});

Deno.test("ToolRegistry: listTools()は空のレジストリで空配列を返す", () => {
  const registry = new ToolRegistry();

  const tools = registry.listTools();

  assertEquals(tools.length, 0);
});

Deno.test("ToolRegistry: execute()がツールを正しく実行する", async () => {
  const registry = new ToolRegistry();
  registry.register(createTestTool("exec_tool"));

  const result = await registry.execute("exec_tool", { path: "test.md" });

  assertExists(result);
  assertEquals(result.content[0].type, "text");
  const text = (result.content[0] as { type: "text"; text: string }).text;
  assertEquals(text.includes("exec_tool"), true);
});

Deno.test("ToolRegistry: execute()が未登録ツールでエラー結果を返す", async () => {
  const registry = new ToolRegistry();

  const result = await registry.execute("unknown_tool", {});

  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("ToolRegistry: toMcpTools()がMCP形式のツール配列を返す", () => {
  const registry = new ToolRegistry();
  registry.register(createTestTool("mcp_tool"));

  const mcpTools = registry.toMcpTools();

  assertEquals(mcpTools.length, 1);
  assertEquals(mcpTools[0].name, "mcp_tool");
  assertExists(mcpTools[0].inputSchema);
  // execute関数は含まれないことを確認
  assertEquals("execute" in mcpTools[0], false);
});
