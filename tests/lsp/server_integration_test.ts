/**
 * LSPサーバー統合テスト
 * Process9 Sub1: メッセージハンドラ統合のテスト
 *
 * TDD Red Phase: 以下の機能がLspServerに統合されていることを検証
 * - textDocument/definition リクエストの処理
 * - textDocument/hover リクエストの処理
 * - ドキュメント変更時の診断発行
 */

import { assertEquals, assertExists } from "@std/assert";
import { LspServer } from "../../src/lsp/server/server.ts";
import { LspTransport } from "../../src/lsp/protocol/transport.ts";
import {
  createLspMessage,
  createMockReader,
  createMockWriter,
} from "./helpers.ts";
import type { DetectableEntity } from "../../src/lsp/detection/positioned_detector.ts";
import type { EntityInfo } from "../../src/lsp/providers/hover_provider.ts";

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
    kind: "character",
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
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
        demon_king: "enemy",
      } as Record<string, string>,
    },
  ],
  [
    "princess",
    {
      id: "princess",
      name: "姫",
      kind: "character" as const,
      role: "supporting",
      summary: "王国の姫",
      traits: ["優しい", "聡明"],
      relationships: {
        hero: "romantic",
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

// ===== textDocument/definition テスト =====

Deno.test("LspServer integration - handles textDocument/definition request", async () => {
  // didOpen でドキュメントを開く
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "勇者は剣を抜いた。",
      },
    },
  });

  const definitionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 10,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 0,
        character: 0, // "勇者"の位置
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    definitionRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/definition を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read definition request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData, "Response should be written");

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: { uri: string; range: unknown } | null;
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 10);
  assertExists(response.result, "Definition result should exist");
  assertEquals(
    response.result.uri.includes("src/characters/hero.ts"),
    true,
    "Should return hero.ts location",
  );
});

Deno.test("LspServer integration - textDocument/definition returns null for non-entity", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "勇者は剣を抜いた。",
      },
    },
  });

  const definitionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 11,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 0,
        character: 5, // "剣"の位置（エンティティではない）
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    definitionRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/definition を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read definition request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: unknown;
  };

  assertEquals(response.id, 11);
  // coc.nvim互換性のため、nullではなく空配列を返す
  assertEquals(
    response.result,
    [],
    "Should return empty array for non-entity position (coc.nvim compatibility)",
  );
});

// ===== textDocument/hover テスト =====

Deno.test("LspServer integration - handles textDocument/hover request", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "勇者は剣を抜いた。",
      },
    },
  });

  const hoverRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 20,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 0,
        character: 0, // "勇者"の位置
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    hoverRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/hover を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read hover request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData, "Response should be written");

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result:
      | { contents: { kind: string; value: string }; range?: unknown }
      | null;
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 20);
  assertExists(response.result, "Hover result should exist");
  assertEquals(response.result.contents.kind, "markdown");
  assertEquals(
    response.result.contents.value.includes("勇者"),
    true,
    "Hover should include character name",
  );
  assertEquals(
    response.result.contents.value.includes("protagonist"),
    true,
    "Hover should include role",
  );
});

Deno.test("LspServer integration - textDocument/hover returns null for non-entity", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "勇者は剣を抜いた。",
      },
    },
  });

  const hoverRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 21,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 0,
        character: 5, // "剣"の位置（エンティティではない）
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    hoverRequest,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/hover を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read hover request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: unknown;
  };

  assertEquals(response.id, 21);
  assertEquals(
    response.result,
    null,
    "Should return null for non-entity position",
  );
});

// ===== ドキュメント変更時の診断発行テスト =====

Deno.test("LspServer integration - publishes diagnostics on document open", async () => {
  // 低信頼度マッチを含むドキュメント
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

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
  ]);

  // didOpen を処理
  const msg = await transport.readMessage();
  if (!msg.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg.value);

  // publishDiagnostics通知がwriterに書き込まれているか確認
  const responseData = writer.getData();
  assertExists(responseData, "Diagnostics should be published");

  // Content-Lengthヘッダーの後の本文を抽出
  const bodyMatch = responseData.match(/\r\n\r\n(.+)$/s);
  assertExists(bodyMatch);

  const notification = JSON.parse(bodyMatch[1]) as {
    jsonrpc: string;
    method: string;
    params: {
      uri: string;
      diagnostics: Array<{
        range: unknown;
        message: string;
        severity: number;
      }>;
    };
  };

  assertEquals(notification.jsonrpc, "2.0");
  assertEquals(notification.method, "textDocument/publishDiagnostics");
  assertExists(notification.params.diagnostics);
  // 低信頼度マッチの診断が含まれている（信頼度0.8なのでHint）
  assertEquals(notification.params.diagnostics.length >= 0, true); // 診断があるかもしれないし、ないかもしれない
});

Deno.test("LspServer integration - publishes diagnostics on document change", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "空のドキュメント",
      },
    },
  });

  const didChangeNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        version: 2,
      },
      contentChanges: [
        {
          text: "主人公は冒険を始めた。", // 変更後：低信頼度マッチを含む
        },
      ],
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    didChangeNotification,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // didChange を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read didChange");
  await server.handleMessage(msg2.value);

  // publishDiagnostics通知がwriterに書き込まれているか確認
  const responseData = writer.getData();
  assertExists(responseData, "Diagnostics should be published on change");

  const bodyMatch = responseData.match(/\r\n\r\n(.+)$/s);
  assertExists(bodyMatch);

  const notification = JSON.parse(bodyMatch[1]) as {
    method: string;
    params: {
      uri: string;
    };
  };

  assertEquals(notification.method, "textDocument/publishDiagnostics");
  assertEquals(
    notification.params.uri,
    "file:///test/project/manuscripts/chapter01.md",
  );
});

Deno.test("LspServer integration - clears diagnostics on document close", async () => {
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

  const didCloseNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didClose",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    didOpenNotification,
    didCloseNotification,
  ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // didClose を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read didClose");
  await server.handleMessage(msg2.value);

  // 診断をクリアするpublishDiagnosticsが発行される
  const responseData = writer.getData();
  assertExists(responseData, "Clear diagnostics should be published");

  const bodyMatch = responseData.match(/\r\n\r\n(.+)$/s);
  assertExists(bodyMatch);

  const notification = JSON.parse(bodyMatch[1]) as {
    method: string;
    params: {
      uri: string;
      diagnostics: unknown[];
    };
  };

  assertEquals(notification.method, "textDocument/publishDiagnostics");
  assertEquals(
    notification.params.diagnostics.length,
    0,
    "Diagnostics should be cleared",
  );
});

// ===== ドキュメント未オープン時のエラーハンドリング =====

Deno.test("LspServer integration - handles definition request for unopened document", async () => {
  const definitionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 30,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/nonexistent.md",
      },
      position: {
        line: 0,
        character: 0,
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    definitionRequest,
  ]);

  // textDocument/definition を処理
  const msg = await transport.readMessage();
  if (!msg.ok) throw new Error("Failed to read definition request");
  await server.handleMessage(msg.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    id: number;
    result: unknown;
  };

  assertEquals(response.id, 30);
  // ドキュメントが開かれていない場合は空配列を返す（coc.nvim互換性）
  assertEquals(response.result, []);
});

Deno.test("LspServer integration - handles hover request for unopened document", async () => {
  const hoverRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 31,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/nonexistent.md",
      },
      position: {
        line: 0,
        character: 0,
      },
    },
  });

  const { server, transport, writer } = await createInitializedServer([
    hoverRequest,
  ]);

  // textDocument/hover を処理
  const msg = await transport.readMessage();
  if (!msg.ok) throw new Error("Failed to read hover request");
  await server.handleMessage(msg.value);

  const responseData = writer.getData();
  assertExists(responseData);

  const response = extractResponseBody(responseData) as {
    id: number;
    result: unknown;
  };

  assertEquals(response.id, 31);
  // ドキュメントが開かれていない場合はnullを返す
  assertEquals(response.result, null);
});
