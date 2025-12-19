/**
 * LSPサーバー Code Action統合テスト
 * Process1 Sub2: textDocument/codeActionリクエストのテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 *
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
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
import type { EntityInfo } from "@storyteller/lsp/providers/hover_provider.ts";
import { getServerCapabilities } from "@storyteller/lsp/server/capabilities.ts";

// テスト用のモックエンティティデータ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"], // alias -> confidence 0.8
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "character",
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
];

// テスト用のエンティティ情報マップ
const mockEntityInfoMap = new Map<string, EntityInfo>([
  [
    "hero",
    {
      id: "hero",
      name: "勇者",
      kind: "character" as const,
      role: "protagonist",
      summary: "魔王を倒すために旅立った若者",
      traits: ["勇敢", "正義感"],
      relationships: {
        princess: "ally",
      } as Record<string, string>,
    },
  ],
]);

/**
 * ヘルパー: 初期化済みのLspServerを作成
 */
async function createInitializedServer(
  additionalMessages: string[] = [],
): Promise<{
  server: LspServer;
  transport: LspTransport;
  writer: ReturnType<typeof createMockWriter>;
}> {
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

  const allMessages = [
    initRequest,
    initializedNotification,
    ...additionalMessages,
  ];
  const reader = createMockReader(allMessages.map(createLspMessage).join(""));
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  // initialize を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read initialize message");
  await server.handleMessage(msg1.value);

  // initialized を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read initialized message");
  await server.handleMessage(msg2.value);

  // writerをクリア（初期化シーケンスの出力を消去）
  writer.clear();

  return { server, transport, writer };
}

/**
 * ヘルパー: LSPレスポンス本文を抽出
 */
function extractResponseBody(data: string): unknown {
  const bodyMatch = data.match(/\r\n\r\n(.+)$/s);
  if (!bodyMatch) throw new Error("Failed to extract response body");
  return JSON.parse(bodyMatch[1]);
}

// ===== capabilities テスト =====

Deno.test("ServerCapabilities - includes codeActionProvider: true", () => {
  const capabilities = getServerCapabilities();

  assertEquals(
    capabilities.codeActionProvider,
    true,
    "capabilities should include codeActionProvider: true",
  );
});

// ===== textDocument/codeAction テスト =====

Deno.test("LspServer - handles textDocument/codeAction request for low confidence reference", async () => {
  // didOpen でドキュメントを開く
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "主人公は冒険を始めた。", // "主人公" はaliasで信頼度0.8
      },
    },
  });

  const codeActionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 100,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 },
      },
      context: {
        diagnostics: [],
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    codeActionRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/codeAction を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read codeAction request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData, "Response should be written");

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result:
      | Array<{
        title: string;
        kind: string;
        edit?: {
          changes: {
            [uri: string]: Array<{ range: unknown; newText: string }>;
          };
        };
      }>
      | null;
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 100);
  assertExists(response.result, "Code action result should exist");
  assertEquals(
    response.result.length > 0,
    true,
    "Should return at least one code action",
  );

  const action = response.result[0];
  assertEquals(action.kind, "quickfix");
  assertEquals(
    action.title.includes("@hero"),
    true,
    "Title should mention @hero",
  );
});

Deno.test("LspServer - returns empty array for high confidence reference", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "勇者は剣を抜いた。", // "勇者" はnameで信頼度1.0
      },
    },
  });

  const codeActionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 101,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 2 },
      },
      context: {
        diagnostics: [],
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    codeActionRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/codeAction を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read codeAction request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: unknown[] | null;
  };

  assertEquals(response.id, 101);
  // 高信頼度の参照には空の配列を返す
  assertEquals(
    Array.isArray(response.result) && response.result.length === 0,
    true,
    "Should return empty array for high confidence reference",
  );
});

Deno.test("LspServer - returns empty array for unopened document", async () => {
  const codeActionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 102,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/nonexistent.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 },
      },
      context: {
        diagnostics: [],
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    codeActionRequest,
  ]);

  // textDocument/codeAction を処理
  const msg = await transport.readMessage();
  if (!msg.ok) throw new Error("Failed to read codeAction request");
  await server.handleMessage(msg.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: unknown[] | null;
  };

  assertEquals(response.id, 102);
  // 開かれていないドキュメントには空の配列を返す
  assertEquals(
    Array.isArray(response.result) && response.result.length === 0,
    true,
    "Should return empty array for unopened document",
  );
});

Deno.test("LspServer - code action includes correct workspace edit", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "主人公は冒険を始めた。",
      },
    },
  });

  const codeActionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 103,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 },
      },
      context: {
        diagnostics: [],
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    codeActionRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/codeAction を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read codeAction request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    result: Array<{
      edit?: {
        changes: {
          [uri: string]: Array<{
            range: {
              start: { line: number; character: number };
              end: { line: number; character: number };
            };
            newText: string;
          }>;
        };
      };
    }>;
  };

  assertExists(response.result);
  assertEquals(response.result.length > 0, true);

  const action = response.result[0];
  assertExists(action.edit, "Code action should have edit");
  assertExists(action.edit.changes, "Edit should have changes");

  const uri = "file:///test/project/manuscripts/chapter01.md";
  const edits = action.edit.changes[uri];
  assertExists(edits, "Changes should include the document URI");
  assertEquals(edits.length > 0, true);

  const edit = edits[0];
  assertEquals(edit.newText, "@hero");
  assertEquals(edit.range.start.line, 0);
  assertEquals(edit.range.start.character, 0);
  assertEquals(edit.range.end.character, 3);
});
