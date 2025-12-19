/**
 * mcpコマンドグループのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { createMcpDescriptor } from "@storyteller/cli/modules/mcp/index.ts";
import { createCommandRegistry } from "@storyteller/cli/command_registry.ts";

Deno.test("createMcpDescriptor: コマンドグループを返す", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor);
  assertEquals(descriptor.name, "mcp");
});

Deno.test("createMcpDescriptor: サマリーがMCPに関連する内容である", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor.summary);
  assertEquals(descriptor.summary.includes("MCP"), true);
});

Deno.test("createMcpDescriptor: 子コマンドにstartが含まれる", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor.children);
  const startChild = descriptor.children.find((c) => c.name === "start");
  assertExists(startChild);
});

Deno.test("createMcpDescriptor: usageが正しく設定されている", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor.usage);
  assertEquals(descriptor.usage.includes("mcp"), true);
});

Deno.test("createMcpDescriptor: examplesが定義されている", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor.examples);
  assertEquals(descriptor.examples.length > 0, true);
});

Deno.test("createMcpDescriptor: handlerが定義されている", () => {
  const registry = createCommandRegistry();
  const descriptor = createMcpDescriptor(registry);

  assertExists(descriptor.handler);
  assertEquals(descriptor.handler.name, "mcp");
});
