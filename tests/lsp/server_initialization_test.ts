/**
 * LSPサーバー初期化テスト
 * Process3: initialize/initialized ハンドシェイクのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { getServerCapabilities } from "@storyteller/lsp/server/capabilities.ts";
import { LspServer } from "@storyteller/lsp/server/server.ts";
import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";
import {
  createLspMessage,
  createMockReader,
  createMockWriter,
} from "./helpers.ts";

// ===== Process3 Sub1: サーバーキャパビリティ定義 =====

Deno.test("ServerCapabilities - getServerCapabilities() returns correct capabilities", () => {
  const capabilities = getServerCapabilities();

  // MVPで必要なキャパビリティが含まれていることを確認
  assertEquals(
    capabilities.textDocumentSync,
    1,
    "textDocumentSync should be Full (1)",
  );
  assertEquals(
    capabilities.definitionProvider,
    true,
    "definitionProvider should be true",
  );
  assertEquals(
    capabilities.hoverProvider,
    true,
    "hoverProvider should be true",
  );
});

Deno.test("ServerCapabilities - has correct structure", () => {
  const capabilities = getServerCapabilities();

  // 型が正しく構造化されていることを確認
  assertExists(capabilities.textDocumentSync);
  assertExists(capabilities.definitionProvider);
  assertExists(capabilities.hoverProvider);
});

// ===== Process3 Sub2: LspServerクラス基盤 =====

Deno.test("LspServer - handleInitialize returns correct response", async () => {
  const initRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  });

  const reader = createMockReader(createLspMessage(initRequest));
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project");

  // handleMessage を呼び出してinitializeを処理
  const message = await transport.readMessage();
  if (!message.ok) throw new Error("Failed to read message");

  await server.handleMessage(message.value);

  // レスポンスを検証
  const responseData = writer.getData();
  assertExists(responseData);

  // Content-Lengthヘッダーの後の本文を抽出
  const bodyMatch = responseData.match(/\r\n\r\n(.+)$/s);
  assertExists(bodyMatch);
  const response = JSON.parse(bodyMatch[1]);

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 1);
  assertExists(response.result);
  assertExists(response.result.capabilities);
  assertEquals(response.result.capabilities.textDocumentSync, 1);
  assertEquals(response.result.capabilities.definitionProvider, true);
  assertEquals(response.result.capabilities.hoverProvider, true);
});

Deno.test("LspServer - handleInitialized processes notification", async () => {
  // 初期化シーケンス
  const initRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  });

  const initializedNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  });

  const reader = createMockReader(
    createLspMessage(initRequest) + createLspMessage(initializedNotification),
  );
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project");

  // initialize
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read message");
  await server.handleMessage(msg1.value);

  // initialized
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read message");
  await server.handleMessage(msg2.value);

  // initialized後はisInitialized()がtrueになる
  assertEquals(server.isInitialized(), true);
});

Deno.test("LspServer - rejects requests before initialization", async () => {
  const otherRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/hover",
    params: {},
  });

  const reader = createMockReader(createLspMessage(otherRequest));
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project");

  // 初期化前にリクエストを処理
  const message = await transport.readMessage();
  if (!message.ok) throw new Error("Failed to read message");

  await server.handleMessage(message.value);

  // エラーレスポンスを検証
  const responseData = writer.getData();
  const bodyMatch = responseData.match(/\r\n\r\n(.+)$/s);
  assertExists(bodyMatch);
  const response = JSON.parse(bodyMatch[1]);

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 2);
  assertExists(response.error);
  assertEquals(response.error.code, -32002); // ServerNotInitialized
});

Deno.test("LspServer - isInitialized returns false before initialization", () => {
  const reader = createMockReader("");
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project");

  assertEquals(server.isInitialized(), false);
});
