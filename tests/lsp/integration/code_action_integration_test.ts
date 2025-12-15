/**
 * LSP Code Action統合テスト
 * Process10 Sub1: エンドツーエンドでCode Actionが動作することを確認
 *
 * テストシナリオ:
 * 1. LSPサーバーを初期化
 * 2. ドキュメントを開く
 * 3. Code Actionをリクエスト
 * 4. TextEditを適用してドキュメントを更新
 * 5. 更新後のドキュメントでCode Actionがなくなることを確認
 */

import { assertEquals, assertExists } from "@std/assert";
import { LspServer } from "../../../src/lsp/server/server.ts";
import { LspTransport } from "../../../src/lsp/protocol/transport.ts";
import {
  createLspMessage,
  createMockWriter,
} from "../helpers.ts";
import type { DetectableEntity } from "../../../src/lsp/detection/positioned_detector.ts";
import type { EntityInfo } from "../../../src/lsp/providers/hover_provider.ts";

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
    aliases: ["お姫様"],
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

// ===== エンドツーエンド Code Action テスト =====

Deno.test("Integration - Code Action E2E: low confidence reference gets code action", async () => {
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

  // 3. Open document with low confidence reference
  // "主人公" はaliasで信頼度0.8
  queue.add(JSON.stringify({
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
  }));

  // 4. Request code action for the low confidence reference
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 10,
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

  const allResponses = extractAllResponses(writer.getData());

  // Code Action response (id: 10)
  const codeActionResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 10,
  ) as {
    id: number;
    result: Array<{
      title: string;
      kind: string;
      edit?: {
        changes: { [uri: string]: Array<{ range: unknown; newText: string }> };
      };
    }> | null;
  };

  assertExists(codeActionResponse, "Code action response should exist");
  assertExists(codeActionResponse.result, "Code action result should exist");
  assertEquals(
    codeActionResponse.result.length > 0,
    true,
    "Should return at least one code action for low confidence reference",
  );

  const action = codeActionResponse.result[0];
  assertEquals(action.kind, "quickfix");
  assertEquals(
    action.title.includes("@hero"),
    true,
    "Title should mention @hero",
  );
  assertExists(action.edit, "Code action should have edit");
  assertExists(action.edit.changes, "Edit should have changes");

  // Verify the text edit
  const uri = "file:///test/project/manuscripts/chapter01.md";
  const edits = action.edit.changes[uri];
  assertExists(edits, "Changes should include the document URI");
  assertEquals(edits[0].newText, "@hero");
});

Deno.test("Integration - Code Action E2E: apply edit and verify no more code actions", async () => {
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

  // 3. Open document with low confidence reference
  queue.add(JSON.stringify({
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
  }));

  // 4. First code action request
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 10,
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
  }));

  // 5. Apply the edit (simulate client applying the code action)
  // Changed "主人公" -> "@hero"
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
          text: "@heroは冒険を始めた。",
        },
      ],
    },
  }));

  // 6. Second code action request after edit
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 11,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      },
      context: {
        diagnostics: [],
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

  // 全てのメッセージを処理
  while (true) {
    const result = await transport.readMessage();
    if (!result.ok) break;
    await server.handleMessage(result.value);
  }

  const allResponses = extractAllResponses(writer.getData());

  // First code action response (id: 10) should have actions
  const firstResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 10,
  ) as {
    result: unknown[] | null;
  };
  assertExists(firstResponse, "First code action response should exist");
  assertEquals(
    Array.isArray(firstResponse.result) && firstResponse.result.length > 0,
    true,
    "First request should return code actions",
  );

  // Second code action response (id: 11) should have no actions
  // because @-prefixed references don't need code actions
  const secondResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 11,
  ) as {
    result: unknown[] | null;
  };
  assertExists(secondResponse, "Second code action response should exist");
  assertEquals(
    Array.isArray(secondResponse.result) && secondResponse.result.length === 0,
    true,
    "Second request should return no code actions after applying edit",
  );
});

Deno.test("Integration - Code Action E2E: multiple low confidence references in document", async () => {
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

  // Open document with multiple references
  // Note: The detection engine merges matches and uses highest confidence
  // "主人公" (alias for hero, confidence 0.8) - no overlap with "勇者" -> code action
  // "城塞" contains "城" (name, confidence 1.0) -> no code action (high confidence)
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "主人公は旅に出た。\n城塞に向かった。",
      },
    },
  }));

  // Request code action for "主人公" - Line 0, char 0-3
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 20,
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
  }));

  // Request code action for "城塞" - Line 1, char 0-2
  // Note: "城塞" contains "城" which matches with high confidence (1.0)
  // So no code action will be suggested
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 21,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 2 },
      },
      context: {
        diagnostics: [],
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

  // Verify code action for "主人公" -> "@hero" (low confidence alias)
  const response20 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 20,
  ) as {
    result: Array<{ title: string; edit?: { changes: Record<string, unknown[]> } }>;
  };
  assertExists(response20.result);
  assertEquals(
    response20.result.length > 0 && response20.result[0].title.includes("@hero"),
    true,
    "Should suggest @hero for 主人公 (alias with confidence 0.8)",
  );

  // Verify NO code action for "城塞" because "城" matches with confidence 1.0
  // The detection engine merges all matches for an entity and uses highest confidence
  const response21 = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 21,
  ) as {
    result: Array<{ title: string; edit?: { changes: Record<string, unknown[]> } }>;
  };
  assertExists(response21.result);
  assertEquals(
    Array.isArray(response21.result) && response21.result.length === 0,
    true,
    "Should NOT suggest code action for 城塞 (contains 城 with confidence 1.0)",
  );
});

Deno.test("Integration - Code Action E2E: high confidence reference returns no code action", async () => {
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

  // Open document with high confidence reference
  // "勇者" is the name (confidence 1.0)
  queue.add(JSON.stringify({
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
  }));

  // Request code action for high confidence reference
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 30,
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

  const response = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 30,
  ) as {
    result: unknown[] | null;
  };

  assertExists(response, "Code action response should exist");
  assertEquals(
    Array.isArray(response.result) && response.result.length === 0,
    true,
    "Should return no code actions for high confidence reference",
  );
});

Deno.test("Integration - Code Action E2E: complete workflow with diagnostics", async () => {
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

  // Open document - this should trigger diagnostics
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
        languageId: "markdown",
        version: 1,
        text: "主人公は城塞に向かった。",
      },
    },
  }));

  // Request code action with diagnostics context
  queue.add(JSON.stringify({
    jsonrpc: "2.0",
    id: 40,
    method: "textDocument/codeAction",
    params: {
      textDocument: {
        uri: "file:///test/project/manuscripts/chapter01.md",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 12 },
      },
      context: {
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 3 },
            },
            message: "低信頼度の参照: 主人公 → hero (80%)",
            severity: 4,
          },
        ],
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

  // Verify diagnostics were published
  const diagnosticsNotifications = allResponses.filter(
    (r: unknown) =>
      (r as { method?: string }).method === "textDocument/publishDiagnostics",
  );
  assertEquals(
    diagnosticsNotifications.length >= 1,
    true,
    "Should have published diagnostics",
  );

  // Verify code action response
  const codeActionResponse = allResponses.find(
    (r: unknown) => (r as { id?: number }).id === 40,
  ) as {
    result: Array<{ title: string }>;
  };

  assertExists(codeActionResponse, "Code action response should exist");
  assertExists(codeActionResponse.result);
  assertEquals(
    codeActionResponse.result.length > 0,
    true,
    "Should return code actions when diagnostics indicate low confidence",
  );
});
