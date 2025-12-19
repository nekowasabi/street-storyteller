/**
 * MCPサーバーのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { McpServer } from "@storyteller/mcp/server/server.ts";
import { McpTransport } from "@storyteller/mcp/protocol/transport.ts";
import type { ResourceProvider } from "@storyteller/mcp/resources/resource_provider.ts";
import type { McpResource } from "@storyteller/mcp/protocol/types.ts";
import { PromptRegistry } from "@storyteller/mcp/prompts/prompt_registry.ts";
import { ToolRegistry } from "@storyteller/mcp/tools/tool_registry.ts";
import { MCP_ERROR_CODES } from "@storyteller/mcp/protocol/types.ts";

/**
 * テスト用のモックReader
 */
class MockReader {
  private data: Uint8Array;
  private position = 0;

  constructor(messages: object[]) {
    const parts: string[] = [];
    for (const msg of messages) {
      const body = JSON.stringify(msg);
      const bodyBytes = new TextEncoder().encode(body);
      parts.push(`Content-Length: ${bodyBytes.length}\r\n\r\n${body}`);
    }
    this.data = new TextEncoder().encode(parts.join(""));
  }

  async read(p: Uint8Array): Promise<number | null> {
    if (this.position >= this.data.length) {
      return null;
    }
    const bytesToRead = Math.min(p.length, this.data.length - this.position);
    p.set(this.data.subarray(this.position, this.position + bytesToRead));
    this.position += bytesToRead;
    return bytesToRead;
  }
}

/**
 * テスト用のモックWriter
 */
class MockWriter {
  private chunks: Uint8Array[] = [];

  async write(p: Uint8Array): Promise<number> {
    this.chunks.push(new Uint8Array(p));
    return p.length;
  }

  getResponses(): object[] {
    const output = this.getOutput();
    const responses: object[] = [];
    const regex = /Content-Length:\s*(\d+)\r\n\r\n/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(output)) !== null) {
      const length = parseInt(match[1], 10);
      const bodyStart = match.index + match[0].length;
      const body = output.substring(bodyStart, bodyStart + length);
      try {
        responses.push(JSON.parse(body));
      } catch {
        // skip invalid JSON
      }
      lastIndex = bodyStart + length;
      regex.lastIndex = lastIndex;
    }

    return responses;
  }

  private getOutput(): string {
    const totalLength = this.chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(result);
  }
}

class MockResourceProvider implements ResourceProvider {
  constructor(private readonly resources: readonly McpResource[]) {}
  async listResources(): Promise<McpResource[]> {
    return [...this.resources];
  }
  async readResource(uri: string): Promise<string> {
    return JSON.stringify({ uri });
  }
}

function createPromptRegistry(): PromptRegistry {
  const registry = new PromptRegistry();
  registry.register({
    name: "character_brainstorm",
    description: "Brainstorm a character",
    getMessages: (args) => [{ role: "user", content: `role=${args.role}` }],
  });
  return registry;
}

Deno.test("McpServer: initializeリクエストに正しく応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  };

  const reader = new MockReader([initRequest]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 1);

  const response = responses[0] as {
    jsonrpc: string;
    id: number;
    result?: {
      protocolVersion: string;
      capabilities: object;
      serverInfo: { name: string };
    };
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 1);
  assertExists(response.result);
  assertExists(response.result.protocolVersion);
  assertExists(response.result.capabilities);
  assertExists(response.result.serverInfo);
  assertEquals(response.result.serverInfo.name, "storyteller-mcp");
});

Deno.test("McpServer: 初期化前のリクエストを拒否する", async () => {
  const toolsListRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  };

  const reader = new MockReader([toolsListRequest]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 1);

  const response = responses[0] as {
    jsonrpc: string;
    id: number;
    error?: { code: number; message: string };
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 1);
  assertExists(response.error);
  assertEquals(response.error.code, -32002); // Server not initialized
});

Deno.test("McpServer: initialized通知で状態がinitializedに遷移する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
  };
  const toolsListRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    toolsListRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  // initialize と tools/list の2つのレスポンスが期待される
  assertEquals(responses.length, 2);

  // 2番目のレスポンス（tools/list）がエラーでないことを確認
  const toolsResponse = responses[1] as {
    jsonrpc: string;
    id: number;
    result?: { tools: unknown[] };
    error?: { code: number };
  };

  assertEquals(toolsResponse.id, 2);
  // 初期化後はエラーではなく結果を返すべき
  assertEquals(toolsResponse.error, undefined);
  assertExists(toolsResponse.result);
});

Deno.test("McpServer: resources/list に正しく応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
  };
  const resourcesListRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "resources/list",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    resourcesListRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const resourceProvider = new MockResourceProvider([
    { uri: "storyteller://characters", name: "Characters" },
  ]);

  const server = new McpServer(transport, { resourceProvider } as any);
  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as {
    id: number;
    result?: { resources: Array<{ uri: string }> };
    error?: unknown;
  };
  assertEquals(response.id, 2);
  assertExists(response.result);
  assertEquals(response.result.resources[0].uri, "storyteller://characters");
});

Deno.test("McpServer: resources/read に正しく応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
  };
  const resourcesReadRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "resources/read",
    params: { uri: "storyteller://characters" },
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    resourcesReadRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const resourceProvider = new MockResourceProvider([
    { uri: "storyteller://characters", name: "Characters" },
  ]);

  const server = new McpServer(transport, { resourceProvider } as any);
  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as {
    id: number;
    result?: { contents: Array<{ uri: string; text?: string }> };
    error?: unknown;
  };
  assertEquals(response.id, 2);
  assertExists(response.result);
  assertEquals(response.result.contents[0].uri, "storyteller://characters");
  assertEquals(typeof response.result.contents[0].text, "string");
});

Deno.test("McpServer: prompts/list に正しく応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const promptsListRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "prompts/list",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    promptsListRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const promptRegistry = createPromptRegistry();
  const server = new McpServer(transport, { promptRegistry } as any);
  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as {
    id: number;
    result?: { prompts: Array<{ name: string }> };
  };
  assertEquals(response.id, 2);
  assertExists(response.result);
  assertEquals(
    response.result.prompts.some((p) => p.name === "character_brainstorm"),
    true,
  );
});

Deno.test("McpServer: prompts/get に正しく応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const promptsGetRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "prompts/get",
    params: {
      name: "character_brainstorm",
      arguments: { role: "protagonist" },
    },
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    promptsGetRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const promptRegistry = createPromptRegistry();
  const server = new McpServer(transport, { promptRegistry } as any);
  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as {
    id: number;
    result?: { messages: Array<{ role: string; content: string }> };
  };
  assertEquals(response.id, 2);
  assertExists(response.result);
  assertEquals(
    response.result.messages[0].content.includes("protagonist"),
    true,
  );
});

Deno.test("McpServer: 未知のメソッドにエラーを返す", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
  };
  const unknownRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "unknown/method",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    unknownRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);

  const unknownResponse = responses[1] as {
    jsonrpc: string;
    id: number;
    error?: { code: number; message: string };
  };

  assertEquals(unknownResponse.id, 2);
  assertExists(unknownResponse.error);
  assertEquals(unknownResponse.error.code, -32601); // Method not found
});

Deno.test("McpServer: isInitializedがサーバー状態を正しく返す", () => {
  const reader = new MockReader([]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  assertEquals(server.isInitialized(), false);
});

Deno.test("McpServer: tools/call は toolRegistry 未設定だとエラー", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const callToolRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "meta_check", arguments: {} },
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    callToolRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as { id: number; error?: { code: number } };
  assertEquals(response.id, 2);
  assertExists(response.error);
  assertEquals(response.error.code, -32601);
});

Deno.test("McpServer: tools/call は toolRegistry 経由でツールを実行する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const callToolRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "demo_tool", arguments: { n: 1 } },
  };

  const registry = new ToolRegistry();
  registry.register({
    name: "demo_tool",
    description: "demo",
    inputSchema: { type: "object" },
    execute: async (args) => ({
      content: [{ type: "text", text: `n=${args.n}` }],
      isError: false,
    }),
  });

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    callToolRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport, {
    toolRegistry: registry,
    tools: registry.toMcpTools(),
  } as any);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as {
    id: number;
    result?: { content: Array<{ type: string; text?: string }> };
  };
  assertEquals(response.id, 2);
  assertExists(response.result);
  assertEquals(response.result.content[0].text, "n=1");
});

Deno.test("McpServer: resources/read は uri が無いと INVALID_PARAMS", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const readRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "resources/read",
    params: {},
  };

  const resourceProvider = new MockResourceProvider([
    { uri: "storyteller://characters", name: "Characters" },
  ]);

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    readRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport, { resourceProvider } as any);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as { id: number; error?: { code: number } };
  assertEquals(response.id, 2);
  assertExists(response.error);
  assertEquals(response.error.code, MCP_ERROR_CODES.INVALID_PARAMS);
});

Deno.test("McpServer: resources/list は provider が無いとエラー", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const listRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "resources/list",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    listRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as { id: number; error?: { code: number } };
  assertEquals(response.id, 2);
  assertExists(response.error);
  assertEquals(response.error.code, -32601);
});

Deno.test("McpServer: prompts/get は name が無いと INVALID_PARAMS", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const getRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "prompts/get",
    params: {},
  };

  const promptRegistry = createPromptRegistry();
  const reader = new MockReader([
    initRequest,
    initializedNotification,
    getRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport, { promptRegistry } as any);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as { id: number; error?: { code: number } };
  assertEquals(response.id, 2);
  assertExists(response.error);
  assertEquals(response.error.code, MCP_ERROR_CODES.INVALID_PARAMS);
});

Deno.test("McpServer: shutdown に成功応答する", async () => {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client" },
    },
  };
  const initializedNotification = { jsonrpc: "2.0", method: "initialized" };
  const shutdownRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "shutdown",
    params: {},
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    shutdownRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);
  const response = responses[1] as { id: number; result?: null };
  assertEquals(response.id, 2);
  assertEquals(response.result, null);
});
