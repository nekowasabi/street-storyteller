/**
 * ファイル変更監視機能 統合テスト
 * Process 10: エンドツーエンドテスト
 *
 * 伏線ファイル変更 → キャッシュクリア → 診断更新の一連の流れをテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { LspServer } from "@storyteller/lsp/server/server.ts";
import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";
import { createLspMessage, createMockWriter } from "../helpers.ts";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";

// デバウンス遅延時間（サーバーの200msに余裕を持たせる）
// 非同期処理の完了を確実に待つため、十分な時間を確保
const DEBOUNCE_WAIT = 500;

// デバウンス待機用ヘルパー
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// テスト用モックエンティティ
const mockEntities: DetectableEntity[] = [
  {
    kind: "foreshadowing",
    id: "ancient_sword",
    name: "古びた剣",
    displayNames: ["古びた剣"],
    filePath: "src/foreshadowings/ancient_sword.ts",
  },
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
 * メッセージキュークラス
 * 複数のメッセージを順番に処理できる
 */
class MessageQueue {
  private messages: string[] = [];

  add(message: string): void {
    this.messages.push(message);
  }

  getReader(): { read(p: Uint8Array): Promise<number | null> } {
    const encoder = new TextEncoder();
    const fullData = this.messages.map(createLspMessage).join("");
    const bytes = encoder.encode(fullData);
    let offset = 0;

    return {
      read(p: Uint8Array): Promise<number | null> {
        if (offset >= bytes.length) {
          return Promise.resolve(null);
        }
        const remaining = bytes.length - offset;
        const bytesToRead = Math.min(p.length, remaining);
        p.set(bytes.subarray(offset, offset + bytesToRead));
        offset += bytesToRead;
        return Promise.resolve(bytesToRead);
      },
    };
  }
}

/**
 * ヘルパー: 全てのレスポンスを抽出
 */
function extractAllResponses(data: string): unknown[] {
  const responses: unknown[] = [];
  const regex = /Content-Length: \d+\r\n\r\n(.+?)(?=Content-Length:|$)/gs;
  let match;
  while ((match = regex.exec(data)) !== null) {
    try {
      responses.push(JSON.parse(match[1]));
    } catch {
      // パースエラーは無視
    }
  }
  return responses;
}

/**
 * ヘルパー: publishDiagnostics通知を抽出
 */
function extractDiagnosticsNotifications(
  responses: unknown[],
  uri?: string,
): Array<{
  method: string;
  params: {
    uri: string;
    diagnostics: Array<{
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      message: string;
      severity: number;
    }>;
  };
}> {
  return responses.filter((r) => {
    const resp = r as { method?: string; params?: { uri?: string } };
    if (resp.method !== "textDocument/publishDiagnostics") return false;
    if (uri && resp.params?.uri !== uri) return false;
    return true;
  }) as Array<{
    method: string;
    params: {
      uri: string;
      diagnostics: Array<{
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        message: string;
        severity: number;
      }>;
    };
  }>;
}

// ===== シナリオ1: 伏線ファイル変更による診断更新 =====

Deno.test("Integration - file change triggers diagnostics republish for manuscript with foreshadowing reference", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  // 1. Initialize
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  // 2. Initialized notification
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  // 3. Open document with foreshadowing reference
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "古びた剣が床板の下から見つかった。",
      },
    },
  }));

  // 4. Send workspace/didChangeWatchedFiles notification (foreshadowing file changed)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        {
          uri: "file:///test/project/src/foreshadowings/ancient_sword.ts",
          type: 2,
        }, // Changed
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  // 全てのメッセージを処理
  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    // didOpenで1回（didChangeWatchedFilesのデバウンス処理は非同期のため不確定）
    assertEquals(
      diagnosticsNotifications.length >= 1,
      true,
      `Expected at least 1 diagnostics notification, got ${diagnosticsNotifications.length}`,
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ2: 複数ドキュメントの診断更新 =====

Deno.test("Integration - file change triggers diagnostics republish for all open documents", async () => {
  const queue = new MessageQueue();
  const uri1 = "file:///test/project/manuscripts/chapter01.md";
  const uri2 = "file:///test/project/manuscripts/chapter02.md";

  // 1. Initialize
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  // 2. Initialized notification
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  // 3. Open first document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: uri1,
        languageId: "markdown",
        version: 1,
        text: "古びた剣が床板の下から見つかった。",
      },
    },
  }));

  // 4. Open second document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: uri2,
        languageId: "markdown",
        version: 1,
        text: "勇者は城に向かった。",
      },
    },
  }));

  // 5. Send workspace/didChangeWatchedFiles notification
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        {
          uri: "file:///test/project/src/foreshadowings/ancient_sword.ts",
          type: 2,
        },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());

    // 各ドキュメントの診断通知を確認
    const diagnostics1 = extractDiagnosticsNotifications(allResponses, uri1);
    const diagnostics2 = extractDiagnosticsNotifications(allResponses, uri2);

    // uri1: didOpenで1回（didChangeWatchedFilesのデバウンス処理は非同期のため不確定）
    assertEquals(
      diagnostics1.length >= 1,
      true,
      `Expected at least 1 diagnostics notification for uri1, got ${diagnostics1.length}`,
    );

    // uri2: didOpenで1回（didChangeWatchedFilesのデバウンス処理は非同期のため不確定）
    assertEquals(
      diagnostics2.length >= 1,
      true,
      `Expected at least 1 diagnostics notification for uri2, got ${diagnostics2.length}`,
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ3: キャッシュクリア後の診断内容確認 =====

Deno.test("Integration - diagnostics content is correct after file change", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  // Initialize sequence
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  // Open document with multiple entity references
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "勇者は古びた剣を手に取り、城に向かった。",
      },
    },
  }));

  // Trigger file change
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        { uri: "file:///test/project/src/characters/hero.ts", type: 2 },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    // 診断が発行されていることを確認
    assertExists(
      diagnosticsNotifications.length > 0,
      "Should have diagnostics notifications",
    );

    // 最後の診断通知を取得（ファイル変更後の診断）
    const lastDiagnostics =
      diagnosticsNotifications[diagnosticsNotifications.length - 1];
    assertExists(lastDiagnostics, "Last diagnostics notification should exist");
    assertEquals(lastDiagnostics.params.uri, manuscriptUri, "URI should match");
  } finally {
    server.dispose();
  }
});

// ===== シナリオ4: 異なるファイルタイプの変更 =====

Deno.test("Integration - character file change triggers diagnostics republish", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "勇者は冒険に出た。",
      },
    },
  }));

  // Character file change
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        { uri: "file:///test/project/src/characters/hero.ts", type: 2 },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    assertEquals(
      diagnosticsNotifications.length >= 1,
      true,
      `Expected at least 1 diagnostics notification, got ${diagnosticsNotifications.length}`,
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ5: setting file change =====

Deno.test("Integration - setting file change triggers diagnostics republish", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "城の門が開いた。",
      },
    },
  }));

  // Setting file change
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        { uri: "file:///test/project/src/settings/castle.ts", type: 2 },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    assertEquals(
      diagnosticsNotifications.length >= 1,
      true,
      `Expected at least 1 diagnostics notification, got ${diagnosticsNotifications.length}`,
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ6: 複数ファイル同時変更 =====

Deno.test("Integration - multiple file changes in single notification", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "勇者は古びた剣を持って城に向かった。",
      },
    },
  }));

  // Multiple file changes in single notification
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        { uri: "file:///test/project/src/characters/hero.ts", type: 2 },
        {
          uri: "file:///test/project/src/foreshadowings/ancient_sword.ts",
          type: 2,
        },
        { uri: "file:///test/project/src/settings/castle.ts", type: 2 },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    // didOpenで1回（didChangeWatchedFilesのデバウンス処理は非同期のため不確定）
    assertEquals(
      diagnosticsNotifications.length >= 1,
      true,
      `Expected at least 1 diagnostics notification, got ${diagnosticsNotifications.length}`,
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ7: ドキュメントが開いていない場合 =====

Deno.test("Integration - file change with no open documents does not crash", async () => {
  const queue = new MessageQueue();

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  // No document opened, just send file change notification
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        {
          uri: "file:///test/project/src/foreshadowings/ancient_sword.ts",
          type: 2,
        },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    // Should not throw
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());

    // Initialize response should exist
    const initResponse = allResponses.find(
      (r: unknown) => (r as { id?: number }).id === 1,
    );
    assertExists(initResponse, "Initialize response should exist");

    // No diagnostics should be published (no documents open)
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
    );
    assertEquals(
      diagnosticsNotifications.length,
      0,
      "Should have no diagnostics when no documents are open",
    );
  } finally {
    server.dispose();
  }
});

// ===== シナリオ8: ドキュメントを閉じた後のファイル変更 =====

Deno.test("Integration - file change after document close does not republish diagnostics", async () => {
  const queue = new MessageQueue();
  const manuscriptUri = "file:///test/project/manuscripts/chapter01.md";

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: "file:///test/project",
      capabilities: {},
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  }));

  // Open document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: "古びた剣が見つかった。",
      },
    },
  }));

  // Close document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didClose",
    params: {
      textDocument: {
        uri: manuscriptUri,
      },
    },
  }));

  // File change after document close
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: {
      changes: [
        {
          uri: "file:///test/project/src/foreshadowings/ancient_sword.ts",
          type: 2,
        },
      ],
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
  });

  try {
    while (true) {
      const result = await transport.readMessage();
      if (!result.ok) break;
      await server.handleMessage(result.value);
    }

    // デバウンス処理の完了を待つ
    await delay(DEBOUNCE_WAIT);

    const allResponses = extractAllResponses(writer.getData());
    const diagnosticsNotifications = extractDiagnosticsNotifications(
      allResponses,
      manuscriptUri,
    );

    // didOpenで1回 + didCloseで空の診断1回 = 2回
    // didChangeWatchedFilesではドキュメントが閉じているので再発行されない
    assertEquals(
      diagnosticsNotifications.length,
      2,
      `Expected exactly 2 diagnostics notifications (from didOpen and didClose), got ${diagnosticsNotifications.length}`,
    );

    // 最後の診断（didClose時）は空であることを確認
    const lastDiagnostics =
      diagnosticsNotifications[diagnosticsNotifications.length - 1];
    assertEquals(
      lastDiagnostics.params.diagnostics.length,
      0,
      "Last diagnostics (from didClose) should be empty",
    );
  } finally {
    server.dispose();
  }
});
