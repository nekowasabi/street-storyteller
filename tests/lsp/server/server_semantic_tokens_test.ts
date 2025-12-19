/**
 * LSPサーバー セマンティックトークン統合テスト
 * Process4: サーバーハンドラー統合テスト
 *
 * TDD Red Phase: セマンティックトークンリクエストのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { LspServer } from "@storyteller/lsp/server/server.ts";
import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";
import {
  createLspMessage,
  createMockReader,
  createMockWriter,
} from "../helpers.ts";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティデータ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"],
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    filePath: "src/settings/castle.ts",
  },
];

/**
 * テスト用のLSPサーバーを作成
 */
function createTestServer(inputData: string) {
  const reader = createMockReader(inputData);
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  return { server, writer };
}

/**
 * レスポンスからJSON-RPCオブジェクトを抽出
 */
function extractResponse(data: string): unknown {
  // Content-Lengthヘッダーをスキップ
  const bodyMatch = data.match(/\r\n\r\n(.+)/s);
  if (!bodyMatch) return null;

  // 複数レスポンスがある場合、最後のものを取得
  const bodies = bodyMatch[1].split(/Content-Length: \d+\r\n\r\n/);
  const lastBody = bodies[bodies.length - 1];

  try {
    return JSON.parse(lastBody);
  } catch {
    return null;
  }
}

// ===== サーバー初期化用ヘルパー =====

function createInitializeMessage(id: number = 1): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  });
}

function createInitializedNotification(): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  });
}

function createDidOpenNotification(uri: string, content: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri,
        languageId: "markdown",
        version: 1,
        text: content,
      },
    },
  });
}

function createSemanticTokensFullRequest(id: number, uri: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "textDocument/semanticTokens/full",
    params: {
      textDocument: { uri },
    },
  });
}

function createSemanticTokensRangeRequest(
  id: number,
  uri: string,
  startLine: number,
  endLine: number,
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "textDocument/semanticTokens/range",
    params: {
      textDocument: { uri },
      range: {
        start: { line: startLine, character: 0 },
        end: { line: endLine, character: 1000 },
      },
    },
  });
}

// ===== テスト =====

Deno.test("Server semantic tokens - responds to semanticTokens/full request", async () => {
  const uri = "file:///test/manuscript.md";
  const content = "勇者は冒険を始めた。";

  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
    createSemanticTokensFullRequest(2, uri),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  await server.start();
  const data = writer.getData();
  const response = extractResponse(data);

  assertExists(response);
  // deno-lint-ignore no-explicit-any
  const result = (response as any).result;
  assertExists(result);
  assertExists(result.data);
  assertEquals(Array.isArray(result.data), true);
});

Deno.test("Server semantic tokens - returns tokens for character name", async () => {
  const uri = "file:///test/manuscript.md";
  const content = "勇者は冒険を始めた。";

  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
    createSemanticTokensFullRequest(2, uri),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  await server.start();
  const data = writer.getData();
  const response = extractResponse(data);

  assertExists(response);
  // deno-lint-ignore no-explicit-any
  const result = (response as any).result;
  assertExists(result);

  // "勇者"のトークンがある = 少なくとも5要素
  assertEquals(result.data.length >= 5, true);

  // 最初のトークンを検証
  assertEquals(result.data[0], 0); // line_delta
  assertEquals(result.data[1], 0); // char_delta
  assertEquals(result.data[2], 2); // length ("勇者"は2文字)
  assertEquals(result.data[3], 0); // token_type (character = 0)
});

Deno.test("Server semantic tokens - responds to semanticTokens/range request", async () => {
  const uri = "file:///test/manuscript.md";
  const content = "勇者は冒険を始めた。\n城に向かった。";

  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
    createSemanticTokensRangeRequest(2, uri, 0, 0),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  await server.start();
  const data = writer.getData();
  const response = extractResponse(data);

  assertExists(response);
  // deno-lint-ignore no-explicit-any
  const result = (response as any).result;
  assertExists(result);
  assertExists(result.data);

  // 0行目のみ（勇者のみ）= 5要素
  assertEquals(result.data.length, 5);
});

Deno.test("Server semantic tokens - empty document returns empty data", async () => {
  const uri = "file:///test/empty.md";
  const content = "";

  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
    createSemanticTokensFullRequest(2, uri),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  await server.start();
  const data = writer.getData();
  const response = extractResponse(data);

  assertExists(response);
  // deno-lint-ignore no-explicit-any
  const result = (response as any).result;
  assertExists(result);
  assertEquals(result.data.length, 0);
});
