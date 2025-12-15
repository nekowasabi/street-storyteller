/**
 * LSPサーバー統合テスト
 * Process10 Sub2: 統合テスト
 *
 * 以下のシナリオをテスト:
 * - 完全な編集セッションのシミュレーション
 * - 複数ドキュメントの同時編集
 */

import { assertEquals, assertExists } from "@std/assert";
import { LspServer } from "../../src/lsp/server/server.ts";
import { LspTransport } from "../../src/lsp/protocol/transport.ts";
import { createLspMessage, createMockWriter } from "../lsp/helpers.ts";
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
    kind: "character",
    id: "wizard",
    name: "魔法使い",
    displayNames: ["魔法使い", "魔術師"],
    aliases: ["賢者"],
    filePath: "src/characters/wizard.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
  {
    kind: "setting",
    id: "forest",
    name: "森",
    displayNames: ["森", "深い森"],
    aliases: ["樹海"],
    filePath: "src/settings/forest.ts",
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
        wizard: "mentor",
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
  [
    "wizard",
    {
      id: "wizard",
      name: "魔法使い",
      kind: "character" as const,
      role: "supporting",
      summary: "古代の知識を持つ魔法使い",
      traits: ["賢い", "神秘的"],
      relationships: {
        hero: "mentor",
      } as Record<string, string>,
    },
  ],
]);

/**
 * シンプルなメッセージキューを使ったヘルパー
 * 複数のメッセージを順番に処理できる
 */
class MessageQueue {
  private messages: string[] = [];
  private position = 0;

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

// ===== 完全な編集セッションのシミュレーション =====

Deno.test("Integration - complete edit session: initialize -> open -> edit -> hover -> definition -> close", async () => {
  const queue = new MessageQueue();

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

  // 3. Open document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "第一章: 始まり\n\n勇者は旅に出た。",
      },
    },
  }));

  // 4. Edit document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        version: 2,
      },
      contentChanges: [
        {
          text: "第一章: 始まり\n\n勇者は旅に出た。姫は城で待っていた。",
        },
      ],
    },
  }));

  // 5. Hover request
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 10,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 2,
        character: 0, // "勇者"の位置
      },
    },
  }));

  // 6. Definition request
  // "勇者は旅に出た。姫は城で待っていた。" - "姫" は位置8 (勇者は旅に出た。= 8文字: 勇者=2, は=1, 旅=1, に=1, 出=1, た=1, 。=1)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 11,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      position: {
        line: 2,
        character: 8, // "姫"の位置
      },
    },
  }));

  // 7. Close document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didClose",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
    },
  }));

  // 8. Shutdown
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 100,
    method: "shutdown",
    params: null,
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  // 全てのメッセージを処理
  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  // レスポンスの検証
  const allResponses = extractAllResponses(writer.getData());

  // initialize response (id: 1)
  const initResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 1,
  ) as { id: number; result: { capabilities: unknown } };
  assertExists(initResponse, "Initialize response should exist");
  assertExists(initResponse.result.capabilities, "Capabilities should exist");

  // hover response (id: 10)
  const hoverResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 10,
  ) as { id: number; result: { contents: { value: string } } | null };
  assertExists(hoverResponse, "Hover response should exist");
  assertExists(hoverResponse.result, "Hover result should exist");
  assertEquals(
    hoverResponse.result.contents.value.includes("勇者"),
    true,
    "Hover should contain character name",
  );

  // definition response (id: 11)
  const defResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 11,
  ) as { id: number; result: { uri: string } | null };
  assertExists(defResponse, "Definition response should exist");
  assertExists(defResponse.result, "Definition result should exist");
  assertEquals(
    defResponse.result.uri.includes("princess"),
    true,
    "Definition should point to princess file",
  );

  // shutdown response (id: 100)
  const shutdownResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 100,
  );
  assertExists(shutdownResponse, "Shutdown response should exist");

  // publishDiagnostics notifications should exist
  const diagnosticsNotifications = allResponses.filter(
    (r: unknown) =>
      (r as { method?: string }).method === "textDocument/publishDiagnostics",
  );
  assertEquals(
    diagnosticsNotifications.length >= 1,
    true,
    "Should have published diagnostics",
  );
});

Deno.test("Integration - edit session with multiple changes", async () => {
  const queue = new MessageQueue();

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

  // Open with initial content
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/story.md",
        languageId: "markdown",
        version: 1,
        text: "勇者がいた。",
      },
    },
  }));

  // Multiple changes
  for (let i = 2; i <= 5; i++) {
    queue.add(JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didChange",
      params: {
        textDocument: {
          uri: "file:///test/project/story.md",
          version: i,
        },
        contentChanges: [
          {
            text: `変更${i}: 勇者は冒険を続けた。`,
          },
        ],
      },
    }));
  }

  // Final hover to verify state
  // "変更5: 勇者は冒険を続けた。" - "勇者" は位置5 (変更=2, 5=1, :=1, 空白=1)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 50,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/story.md",
      },
      position: {
        line: 0,
        character: 5, // "勇者"の位置
      },
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // Hover should work after multiple changes
  const hoverResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 50,
  ) as { result: { contents: { value: string } } | null };
  assertExists(hoverResponse, "Hover response should exist");
  assertExists(hoverResponse.result, "Hover result should exist after changes");
});

// ===== 複数ドキュメントの同時編集 =====

Deno.test("Integration - multiple documents: open and edit two documents simultaneously", async () => {
  const queue = new MessageQueue();

  // Initialize
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

  // Open first document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "第一章: 勇者の旅立ち",
      },
    },
  }));

  // Open second document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter02.md",
        languageId: "markdown",
        version: 1,
        text: "第二章: 姫との出会い",
      },
    },
  }));

  // Hover on first document
  // "第一章: 勇者の旅立ち" - "勇者" は位置5 (第一章=3, :=1, 空白=1)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 20,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter01.md",
      },
      position: {
        line: 0,
        character: 5,
      },
    },
  }));

  // Hover on second document
  // "第二章: 姫との出会い" - "姫" は位置5 (第二章=3, :=1, 空白=1)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 21,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter02.md",
      },
      position: {
        line: 0,
        character: 5,
      },
    },
  }));

  // Edit first document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter01.md",
        version: 2,
      },
      contentChanges: [
        {
          text: "第一章: 勇者の旅立ち\n魔法使いが現れた。",
        },
      ],
    },
  }));

  // Definition on first document (now has wizard)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 30,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: "file:///test/project/chapter01.md",
      },
      position: {
        line: 1,
        character: 0, // "魔法使い"の位置
      },
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // Verify hover responses for both documents
  const hover1 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 20,
  ) as { result: { contents: { value: string } } | null };
  assertExists(hover1, "Hover response for chapter01 should exist");
  assertExists(hover1.result, "Hover result for chapter01 should exist");
  assertEquals(
    hover1.result.contents.value.includes("勇者"),
    true,
    "Hover on chapter01 should show hero info",
  );

  const hover2 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 21,
  ) as { result: { contents: { value: string } } | null };
  assertExists(hover2, "Hover response for chapter02 should exist");
  assertExists(hover2.result, "Hover result for chapter02 should exist");
  assertEquals(
    hover2.result.contents.value.includes("姫"),
    true,
    "Hover on chapter02 should show princess info",
  );

  // Verify definition for wizard
  const def1 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 30,
  ) as { result: { uri: string } | null };
  assertExists(def1, "Definition response should exist");
  assertExists(def1.result, "Definition result should exist");
  assertEquals(
    def1.result.uri.includes("wizard"),
    true,
    "Definition should point to wizard file",
  );
});

Deno.test("Integration - multiple documents: close one while keeping other open", async () => {
  const queue = new MessageQueue();

  // Initialize
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

  // Open both documents
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/doc1.md",
        languageId: "markdown",
        version: 1,
        text: "勇者の物語",
      },
    },
  }));

  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/doc2.md",
        languageId: "markdown",
        version: 1,
        text: "姫の物語",
      },
    },
  }));

  // Close first document
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didClose",
    params: {
      textDocument: {
        uri: "file:///test/project/doc1.md",
      },
    },
  }));

  // Hover on closed document (should return null)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 40,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/doc1.md",
      },
      position: {
        line: 0,
        character: 0,
      },
    },
  }));

  // Hover on still-open document (should work)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 41,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/doc2.md",
      },
      position: {
        line: 0,
        character: 0,
      },
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // Hover on closed document should return null
  const hover1 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 40,
  ) as { result: unknown };
  assertExists(hover1, "Response for closed document should exist");
  assertEquals(
    hover1.result,
    null,
    "Hover on closed document should return null",
  );

  // Hover on open document should work
  const hover2 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 41,
  ) as { result: { contents: { value: string } } | null };
  assertExists(hover2, "Response for open document should exist");
  assertExists(hover2.result, "Hover on open document should return result");
});

Deno.test("Integration - multiple documents: interleaved edits", async () => {
  const queue = new MessageQueue();

  // Initialize
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

  // Open three documents
  const docs = ["a.md", "b.md", "c.md"];
  for (const doc of docs) {
    queue.add(JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: `file:///test/project/${doc}`,
          languageId: "markdown",
          version: 1,
          text: `${doc}: 初期内容`,
        },
      },
    }));
  }

  // Interleaved edits
  for (let version = 2; version <= 4; version++) {
    for (const doc of docs) {
      queue.add(JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didChange",
        params: {
          textDocument: {
            uri: `file:///test/project/${doc}`,
            version,
          },
          contentChanges: [
            {
              text: `${doc}: 勇者 v${version}`,
            },
          ],
        },
      }));
    }
  }

  // Verify final state with hover on each
  // "a.md: 勇者 v4" - "勇者" は位置6 (a.md=4, :=1, 空白=1)
  let requestId = 50;
  for (const doc of docs) {
    queue.add(JSON.stringify({
      jsonrpc: "2.0",
      id: requestId++,
      method: "textDocument/hover",
      params: {
        textDocument: {
          uri: `file:///test/project/${doc}`,
        },
        position: {
          line: 0,
          character: 6, // "勇者"の位置
        },
      },
    }));
  }

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // All three documents should have valid hover results
  for (let id = 50; id < 53; id++) {
    const hover = allResponses.find(
      (r: unknown) => (r as { id?: number }).id === id,
    ) as { result: { contents: { value: string } } | null };
    assertExists(hover, `Hover response ${id} should exist`);
    assertExists(hover.result, `Hover result ${id} should exist`);
    assertEquals(
      hover.result.contents.value.includes("勇者"),
      true,
      `Hover ${id} should show hero info`,
    );
  }
});

Deno.test("Integration - error handling: request before initialization", async () => {
  const queue = new MessageQueue();

  // Send hover request before initialize
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 99,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/doc.md",
      },
      position: {
        line: 0,
        character: 0,
      },
    },
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // Should return error response
  const errorResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 99,
  ) as { error?: { code: number; message: string } };
  assertExists(errorResponse, "Error response should exist");
  assertExists(errorResponse.error, "Error should be present");
  assertEquals(
    errorResponse.error.code,
    -32002,
    "Error code should be ServerNotInitialized",
  );
});

Deno.test("Integration - unknown method handling", async () => {
  const queue = new MessageQueue();

  // Initialize
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

  // Send unknown method
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 200,
    method: "textDocument/unknownMethod",
    params: {},
  }));

  const reader = queue.getReader();
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);
  const server = new LspServer(transport, "/test/project", {
    entities: mockEntities,
    entityInfoMap: mockEntityInfoMap,
  });

  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // Should return method not found error
  const errorResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 200,
  ) as { error?: { code: number } };
  assertExists(errorResponse, "Response should exist");
  assertExists(errorResponse.error, "Error should be present");
  assertEquals(
    errorResponse.error.code,
    -32601,
    "Error code should be MethodNotFound",
  );
});
