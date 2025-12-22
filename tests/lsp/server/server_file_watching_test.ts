/**
 * LSPサーバー ファイル変更監視テスト
 * Process 4-6: TDDによる実装
 */

import { assertEquals, assertExists } from "@std/assert";
import { assertSpyCall, spy } from "@std/testing/mock";
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
function createTestServer(inputData: string = "") {
  const reader = createMockReader(inputData);
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  return { server, writer };
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

function createDidChangeWatchedFilesNotification(): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        { uri: "file:///test/foreshadowings/test.ts", type: 2 }, // Changed
      ],
    },
  });
}

/**
 * レスポンスからpublishDiagnostics通知の数をカウント
 */
function countDiagnosticsNotifications(data: string, uri: string): number {
  // publishDiagnostics通知のパターンをカウント
  const pattern = new RegExp(
    `"method"\\s*:\\s*"textDocument/publishDiagnostics"[^}]*"uri"\\s*:\\s*"${
      uri.replace(/\//g, "\\/")
    }"`,
    "g",
  );
  const matches = data.match(pattern);
  return matches ? matches.length : 0;
}

// ===== Process 4: handleDidChangeWatchedFilesメソッドのテスト =====

Deno.test("LspServer - handleDidChangeWatchedFiles clears cache", async () => {
  const { server } = createTestServer();

  // projectContextManagerのclearCacheをspy
  // deno-lint-ignore no-explicit-any
  const projectContextManager = (server as any).projectContextManager;
  const clearCacheSpy = spy(projectContextManager, "clearCache");

  try {
    // handleDidChangeWatchedFilesを直接呼び出し
    // deno-lint-ignore no-explicit-any
    await (server as any).handleDidChangeWatchedFiles({
      changes: [{ uri: "file:///test/foreshadowings/test.ts", type: 2 }],
    });

    assertSpyCall(clearCacheSpy, 0);
  } finally {
    clearCacheSpy.restore();
  }
});

// ===== Process 5: handleNotificationにworkspace/didChangeWatchedFilesケースを追加 =====

Deno.test("LspServer - handleNotification routes workspace/didChangeWatchedFiles", async () => {
  const { server } = createTestServer();

  // handleDidChangeWatchedFilesをspy
  // deno-lint-ignore no-explicit-any
  const handleSpy = spy(server as any, "handleDidChangeWatchedFiles");

  try {
    // handleNotificationを直接呼び出し
    // deno-lint-ignore no-explicit-any
    await (server as any).handleNotification({
      jsonrpc: "2.0",
      method: "workspace/didChangeWatchedFiles",
      params: { changes: [{ uri: "file:///test.ts", type: 2 }] },
    });

    assertSpyCall(handleSpy, 0);
    assertEquals(handleSpy.calls[0].args[0], {
      changes: [{ uri: "file:///test.ts", type: 2 }],
    });
  } finally {
    handleSpy.restore();
  }
});

// ===== Process 6: ファイル変更時の診断再発行 =====

Deno.test("LspServer - handleDidChangeWatchedFiles republishes diagnostics for open documents", async () => {
  const uri = "file:///test/manuscripts/chapter01.md";
  const content = "勇者が冒険に出た";

  // サーバー初期化とドキュメントオープンを含むメッセージ
  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  // サーバーを起動してドキュメントを開く
  await server.start();

  // writerをクリアして、以降の出力のみを確認
  writer.clear();

  // publishDiagnosticsForUriをspy
  // deno-lint-ignore no-explicit-any
  const publishSpy = spy(server as any, "publishDiagnosticsForUri");

  try {
    // handleDidChangeWatchedFilesを呼び出し
    // deno-lint-ignore no-explicit-any
    await (server as any).handleDidChangeWatchedFiles({
      changes: [{ uri: "file:///test/foreshadowings/test.ts", type: 2 }],
    });

    // 開いているドキュメントの診断が再発行されることを確認
    assertSpyCall(publishSpy, 0);
    assertEquals(publishSpy.calls[0].args[0], uri);
  } finally {
    publishSpy.restore();
  }
});

Deno.test("LspServer - handleDidChangeWatchedFiles republishes diagnostics for all open documents", async () => {
  const uri1 = "file:///test/manuscripts/chapter01.md";
  const uri2 = "file:///test/manuscripts/chapter02.md";
  const content1 = "勇者が冒険に出た";
  const content2 = "城に到着した";

  // サーバー初期化と複数ドキュメントオープン
  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri1, content1),
    createDidOpenNotification(uri2, content2),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  await server.start();
  writer.clear();

  // deno-lint-ignore no-explicit-any
  const publishSpy = spy(server as any, "publishDiagnosticsForUri");

  try {
    // deno-lint-ignore no-explicit-any
    await (server as any).handleDidChangeWatchedFiles({
      changes: [{ uri: "file:///test/foreshadowings/test.ts", type: 2 }],
    });

    // 両方のドキュメントの診断が再発行されることを確認
    assertEquals(publishSpy.calls.length, 2);

    // 呼び出されたURIを確認（順序は問わない）
    const calledUris = publishSpy.calls.map((call) => call.args[0]);
    assertEquals(calledUris.includes(uri1), true);
    assertEquals(calledUris.includes(uri2), true);
  } finally {
    publishSpy.restore();
  }
});

Deno.test("LspServer - handleDidChangeWatchedFiles does nothing when no documents are open", async () => {
  const { server } = createTestServer();

  // deno-lint-ignore no-explicit-any
  const publishSpy = spy(server as any, "publishDiagnosticsForUri");
  // deno-lint-ignore no-explicit-any
  const projectContextManager = (server as any).projectContextManager;
  const clearCacheSpy = spy(projectContextManager, "clearCache");

  try {
    // deno-lint-ignore no-explicit-any
    await (server as any).handleDidChangeWatchedFiles({
      changes: [{ uri: "file:///test/foreshadowings/test.ts", type: 2 }],
    });

    // キャッシュはクリアされる
    assertSpyCall(clearCacheSpy, 0);

    // ドキュメントがないので診断は発行されない
    assertEquals(publishSpy.calls.length, 0);
  } finally {
    publishSpy.restore();
    clearCacheSpy.restore();
  }
});

// ===== エンティティ更新テスト =====

Deno.test("LspServer - handleDidChangeWatchedFiles updates detector entities", async () => {
  const { server } = createTestServer();

  // detectorのupdateEntitiesをspy
  // deno-lint-ignore no-explicit-any
  const detector = (server as any).detector;
  const updateEntitiesSpy = spy(detector, "updateEntities");

  try {
    // handleDidChangeWatchedFilesを呼び出し
    // deno-lint-ignore no-explicit-any
    await (server as any).handleDidChangeWatchedFiles({
      changes: [{ uri: "file:///test/foreshadowings/test.ts", type: 2 }],
    });

    // updateEntitiesが呼ばれることを確認
    assertSpyCall(updateEntitiesSpy, 0);

    // 更新されたエンティティは配列であることを確認
    const updatedEntities = updateEntitiesSpy.calls[0].args[0];
    assertEquals(Array.isArray(updatedEntities), true);
  } finally {
    updateEntitiesSpy.restore();
  }
});

// ===== 統合テスト: 通知経由での動作確認 =====

Deno.test("LspServer - workspace/didChangeWatchedFiles notification triggers cache clear and diagnostics republish", async () => {
  const uri = "file:///test/manuscripts/chapter01.md";
  const content = "勇者が冒険に出た";

  // サーバー初期化、ドキュメントオープン、ファイル変更通知を含むメッセージ
  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
    createDidOpenNotification(uri, content),
    createDidChangeWatchedFilesNotification(),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  // サーバーを起動
  await server.start();

  // 出力を確認（textDocument/publishDiagnosticsが複数回発行されるはず）
  const data = writer.getData();

  // publishDiagnostics通知をカウント
  const count = countDiagnosticsNotifications(data, uri);

  // didOpenで1回 + didChangeWatchedFilesで1回 = 少なくとも2回
  assertEquals(
    count >= 2,
    true,
    `Expected at least 2 diagnostics notifications, got ${count}`,
  );
});

// ===== ファイル監視登録テスト =====

Deno.test("LspServer - handleInitialized sends client/registerCapability for file watchers", async () => {
  // サーバー初期化メッセージのみ
  const messages = [
    createInitializeMessage(1),
    createInitializedNotification(),
  ];

  const inputData = messages.map(createLspMessage).join("");
  const { server, writer } = createTestServer(inputData);

  // サーバーを起動
  await server.start();

  // 出力を確認
  const data = writer.getData();

  // client/registerCapability リクエストが送信されていることを確認
  assertEquals(
    data.includes("client/registerCapability"),
    true,
    "Expected client/registerCapability request to be sent",
  );

  // didChangeWatchedFiles メソッドが含まれていることを確認
  assertEquals(
    data.includes("workspace/didChangeWatchedFiles"),
    true,
    "Expected workspace/didChangeWatchedFiles in registration",
  );

  // ファイル監視パターンが含まれていることを確認
  assertEquals(
    data.includes("foreshadowings"),
    true,
    "Expected foreshadowings glob pattern in watchers",
  );
});
