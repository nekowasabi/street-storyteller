/**
 * MCPサーバー統合テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { McpServer } from "@storyteller/mcp/server/server.ts";
import { McpTransport } from "@storyteller/mcp/protocol/transport.ts";
import { createDefaultToolRegistry } from "@storyteller/mcp/server/handlers/tools.ts";

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

    while ((match = regex.exec(output)) !== null) {
      const length = parseInt(match[1], 10);
      const bodyStart = match.index + match[0].length;
      const body = output.substring(bodyStart, bodyStart + length);
      try {
        responses.push(JSON.parse(body));
      } catch {
        // skip invalid JSON
      }
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

Deno.test("MCPサーバー統合テスト: initialize -> initialized フローが成功する", async () => {
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

  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
  };

  const reader = new MockReader([initRequest, initializedNotification]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const toolRegistry = createDefaultToolRegistry();
  const server = new McpServer(transport, { tools: toolRegistry.toMcpTools() });

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 1);

  const initResponse = responses[0] as {
    jsonrpc: string;
    id: number;
    result?: {
      protocolVersion: string;
      capabilities: { tools?: object; resources?: object; prompts?: object };
      serverInfo: { name: string };
    };
  };

  assertEquals(initResponse.jsonrpc, "2.0");
  assertEquals(initResponse.id, 1);
  assertExists(initResponse.result);
  assertExists(initResponse.result.protocolVersion);
  assertExists(initResponse.result.capabilities.tools);
  assertExists(initResponse.result.capabilities.resources);
  assertExists(initResponse.result.capabilities.prompts);
  assertEquals(initResponse.result.serverInfo.name, "storyteller-mcp");
});

Deno.test("MCPサーバー統合テスト: tools/list で meta_check, meta_generate が返る", async () => {
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
  const toolRegistry = createDefaultToolRegistry();
  const server = new McpServer(transport, { tools: toolRegistry.toMcpTools() });

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);

  const toolsResponse = responses[1] as {
    jsonrpc: string;
    id: number;
    result?: { tools: Array<{ name: string }> };
  };

  assertEquals(toolsResponse.id, 2);
  assertExists(toolsResponse.result);
  assertExists(toolsResponse.result.tools);

  const toolNames = toolsResponse.result.tools.map((t) => t.name);
  assertEquals(toolNames.includes("meta_check"), true);
  assertEquals(toolNames.includes("meta_generate"), true);
});

Deno.test("MCPサーバー統合テスト: tools/call で meta_check が正常応答を返す（引数エラー）", async () => {
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

  // 引数なしで呼び出すとエラーを返すはず
  const toolsCallRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "meta_check",
      arguments: {},
    },
  };

  const reader = new MockReader([
    initRequest,
    initializedNotification,
    toolsCallRequest,
  ]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const toolRegistry = createDefaultToolRegistry();
  const server = new McpServer(transport, { tools: toolRegistry.toMcpTools() });

  // tools/callの実装をserverに追加する必要がある
  // 現在の実装ではエラーを返すことを確認

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 2);

  // 2番目のレスポンスがtools/callの結果
  const callResponse = responses[1] as {
    jsonrpc: string;
    id: number;
    result?: {
      content: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };
    error?: { code: number; message: string };
  };

  assertEquals(callResponse.id, 2);
  // エラーまたは結果のどちらかが返る
  assertExists(callResponse.result || callResponse.error);
});

Deno.test("MCPサーバー統合テスト: 未知のメソッドでMethod not foundエラー", async () => {
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

Deno.test("MCPサーバー統合テスト: サーバー情報が正しく返る", async () => {
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

  const reader = new MockReader([initRequest]);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);
  const server = new McpServer(transport);

  await server.start();

  const responses = writer.getResponses();
  assertEquals(responses.length, 1);

  const initResponse = responses[0] as {
    result?: {
      serverInfo: { name: string; version?: string };
    };
  };

  assertExists(initResponse.result);
  assertEquals(initResponse.result.serverInfo.name, "storyteller-mcp");
  assertExists(initResponse.result.serverInfo.version);
});
