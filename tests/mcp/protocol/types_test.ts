/**
 * MCP型定義のテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";

// まだ存在しない型・関数をインポート（これにより失敗する）
import {
  isMcpNotification,
  isMcpRequest,
  isMcpToolCallRequest,
  isMcpToolsListRequest,
  MCP_ERROR_CODES,
  type McpCallToolParams,
  type McpCallToolResult,
  type McpInitializeParams,
  type McpInitializeResult,
  type McpListToolsResult,
  type McpPrompt,
  type McpResource,
  type McpTool,
} from "../../../src/mcp/protocol/types.ts";

Deno.test("McpTool型が正しく定義されている", () => {
  const tool: McpTool = {
    name: "test_tool",
    description: "A test tool",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
      },
      required: ["path"],
    },
  };

  assertEquals(tool.name, "test_tool");
  assertEquals(tool.description, "A test tool");
  assertExists(tool.inputSchema);
  assertEquals(tool.inputSchema.type, "object");
});

Deno.test("McpResource型が正しく定義されている", () => {
  const resource: McpResource = {
    uri: "file:///project/src/main.ts",
    name: "main.ts",
    mimeType: "text/typescript",
    description: "Main entry point",
  };

  assertEquals(resource.uri, "file:///project/src/main.ts");
  assertEquals(resource.name, "main.ts");
  assertEquals(resource.mimeType, "text/typescript");
});

Deno.test("McpPrompt型が正しく定義されている", () => {
  const prompt: McpPrompt = {
    name: "review_code",
    description: "Review code for best practices",
    arguments: [
      { name: "language", description: "Programming language", required: true },
      { name: "focus", description: "Focus area", required: false },
    ],
  };

  assertEquals(prompt.name, "review_code");
  assertEquals(prompt.arguments?.length, 2);
});

Deno.test("McpInitializeParamsが正しく定義されている", () => {
  const params: McpInitializeParams = {
    protocolVersion: "2024-11-05",
    capabilities: {
      roots: { listChanged: true },
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  };

  assertEquals(params.protocolVersion, "2024-11-05");
  assertExists(params.capabilities);
  assertExists(params.clientInfo);
});

Deno.test("McpInitializeResultが正しく定義されている", () => {
  const result: McpInitializeResult = {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    serverInfo: {
      name: "storyteller-mcp",
      version: "0.1.0",
    },
  };

  assertEquals(result.protocolVersion, "2024-11-05");
  assertExists(result.capabilities);
  assertExists(result.serverInfo);
});

Deno.test("McpCallToolParamsが正しく定義されている", () => {
  const params: McpCallToolParams = {
    name: "meta_check",
    arguments: {
      path: "manuscripts/chapter01.md",
    },
  };

  assertEquals(params.name, "meta_check");
  assertEquals(params.arguments?.path, "manuscripts/chapter01.md");
});

Deno.test("McpCallToolResultが正しく定義されている", () => {
  const result: McpCallToolResult = {
    content: [
      { type: "text", text: "Check passed successfully" },
    ],
    isError: false,
  };

  assertEquals(result.content[0].type, "text");
  assertEquals(result.isError, false);
});

Deno.test("McpListToolsResultが正しく定義されている", () => {
  const result: McpListToolsResult = {
    tools: [
      {
        name: "meta_check",
        description: "Check metadata",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };

  assertEquals(result.tools.length, 1);
  assertEquals(result.tools[0].name, "meta_check");
});

Deno.test("MCP_ERROR_CODESが正しく定義されている", () => {
  assertExists(MCP_ERROR_CODES);
  assertExists(MCP_ERROR_CODES.INVALID_REQUEST);
  assertExists(MCP_ERROR_CODES.METHOD_NOT_FOUND);
  assertExists(MCP_ERROR_CODES.INVALID_PARAMS);
  assertExists(MCP_ERROR_CODES.INTERNAL_ERROR);
});

Deno.test("isMcpRequestがリクエストを正しく判定する", () => {
  const request = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "initialize",
    params: {},
  };

  const notification = {
    jsonrpc: "2.0" as const,
    method: "initialized",
  };

  assertEquals(isMcpRequest(request), true);
  assertEquals(isMcpRequest(notification), false);
});

Deno.test("isMcpNotificationが通知を正しく判定する", () => {
  const request = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "initialize",
    params: {},
  };

  const notification = {
    jsonrpc: "2.0" as const,
    method: "initialized",
  };

  assertEquals(isMcpNotification(request), false);
  assertEquals(isMcpNotification(notification), true);
});

Deno.test("isMcpToolCallRequestがtools/callを正しく判定する", () => {
  const toolCallRequest = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "tools/call",
    params: { name: "meta_check", arguments: {} },
  };

  const otherRequest = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "tools/list",
    params: {},
  };

  assertEquals(isMcpToolCallRequest(toolCallRequest), true);
  assertEquals(isMcpToolCallRequest(otherRequest), false);
});

Deno.test("isMcpToolsListRequestがtools/listを正しく判定する", () => {
  const listRequest = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "tools/list",
    params: {},
  };

  const callRequest = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "tools/call",
    params: {},
  };

  assertEquals(isMcpToolsListRequest(listRequest), true);
  assertEquals(isMcpToolsListRequest(callRequest), false);
});
