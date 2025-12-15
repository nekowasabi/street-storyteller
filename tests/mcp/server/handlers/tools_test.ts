/**
 * ツールハンドラーのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  createDefaultToolRegistry,
  handleToolsCall,
  handleToolsList,
} from "../../../../src/mcp/server/handlers/tools.ts";
import { ToolRegistry } from "../../../../src/mcp/tools/tool_registry.ts";

Deno.test("handleToolsList: 登録済みツール一覧を返す", () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "test_tool",
    description: "Test tool",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ content: [{ type: "text", text: "OK" }] }),
  });

  const result = handleToolsList(registry);

  assertExists(result);
  assertExists(result.tools);
  assertEquals(result.tools.length, 1);
  assertEquals(result.tools[0].name, "test_tool");
});

Deno.test("handleToolsList: 空のレジストリで空の配列を返す", () => {
  const registry = new ToolRegistry();

  const result = handleToolsList(registry);

  assertExists(result);
  assertExists(result.tools);
  assertEquals(result.tools.length, 0);
});

Deno.test("handleToolsCall: 指定ツールを実行して結果を返す", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "echo_tool",
    description: "Echo tool",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string" } },
    },
    execute: async (args) => ({
      content: [{ type: "text", text: `Echo: ${args.message}` }],
    }),
  });

  const result = await handleToolsCall(registry, {
    name: "echo_tool",
    arguments: { message: "Hello" },
  });

  assertExists(result);
  assertEquals(result.isError, undefined); // または false
  assertEquals(result.content.length, 1);
  const textContent = result.content[0] as { type: "text"; text: string };
  assertEquals(textContent.text.includes("Echo: Hello"), true);
});

Deno.test("handleToolsCall: 存在しないツール名でエラーを返す", async () => {
  const registry = new ToolRegistry();

  const result = await handleToolsCall(registry, {
    name: "nonexistent_tool",
    arguments: {},
  });

  assertExists(result);
  assertEquals(result.isError, true);
});

Deno.test("handleToolsCall: 引数なしでも実行できる", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "no_args_tool",
    description: "No args tool",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({
      content: [{ type: "text", text: "No args OK" }],
    }),
  });

  const result = await handleToolsCall(registry, {
    name: "no_args_tool",
  });

  assertExists(result);
  assertEquals(result.content.length, 1);
});

Deno.test("createDefaultToolRegistry: meta_checkとmeta_generateを含むレジストリを返す", () => {
  const registry = createDefaultToolRegistry();

  assertExists(registry);
  assertExists(registry.get("meta_check"));
  assertExists(registry.get("meta_generate"));
  // Phase 2: 追加ツール
  assertExists(registry.get("element_create"));
  assertExists(registry.get("view_browser"));
  assertExists(registry.get("lsp_validate"));
  assertExists(registry.get("lsp_find_references"));
});

Deno.test("createDefaultToolRegistry: toMcpTools()で正しいツール配列を返す", () => {
  const registry = createDefaultToolRegistry();
  const tools = registry.toMcpTools();

  assertExists(tools);
  assertEquals(tools.length >= 2, true);

  const toolNames = tools.map((t) => t.name);
  assertEquals(toolNames.includes("meta_check"), true);
  assertEquals(toolNames.includes("meta_generate"), true);
});
