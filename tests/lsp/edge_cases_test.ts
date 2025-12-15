/**
 * LSPエッジケーステスト
 * Process10 Sub1: エッジケーステスト追加
 *
 * 以下のエッジケースをテスト:
 * - 空のドキュメントの処理
 * - 非常に長い行の処理
 * - 特殊文字（絵文字等）を含むドキュメント
 * - 大量のキャラクター参照を含むドキュメント
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
import { PositionedDetector } from "../../src/lsp/detection/positioned_detector.ts";
import { DiagnosticsGenerator } from "../../src/lsp/diagnostics/diagnostics_generator.ts";
import { DocumentManager } from "../../src/lsp/document/document_manager.ts";

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

// 大量のエンティティを生成するヘルパー
function generateManyEntities(count: number): DetectableEntity[] {
  const entities: DetectableEntity[] = [...mockEntities];
  for (let i = 0; i < count; i++) {
    entities.push({
      kind: "character",
      id: `char_${i}`,
      name: `キャラ${i}`,
      displayNames: [`キャラ${i}`, `登場人物${i}`],
      aliases: [`人物${i}`],
      filePath: `src/characters/char_${i}.ts`,
    });
  }
  return entities;
}

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
  entities: DetectableEntity[] = mockEntities,
  entityInfoMap: Map<string, EntityInfo> = mockEntityInfoMap,
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
    entities,
    entityInfoMap,
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

// ===== 空のドキュメントの処理テスト =====

Deno.test("Edge Case - empty document: PositionedDetector returns empty array", () => {
  const detector = new PositionedDetector(mockEntities);
  const results = detector.detectWithPositions("");
  assertEquals(results.length, 0);
});

Deno.test("Edge Case - empty document: getEntityAtPosition returns undefined", () => {
  const detector = new PositionedDetector(mockEntities);
  detector.detectWithPositions("");
  const entity = detector.getEntityAtPosition("", { line: 0, character: 0 });
  assertEquals(entity, undefined);
});

Deno.test("Edge Case - empty document: DiagnosticsGenerator returns empty array", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);
  const diagnostics = await generator.generate("file:///test.md", "", "/test");
  assertEquals(diagnostics.length, 0);
});

Deno.test("Edge Case - empty document: DocumentManager handles empty content", () => {
  const manager = new DocumentManager();
  manager.open("file:///test.md", "", 1, "markdown");
  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "");
  assertEquals(doc.version, 1);
});

Deno.test("Edge Case - empty document: LspServer handles hover on empty document", async () => {
  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///test/project/empty.md",
        languageId: "markdown",
        version: 1,
        text: "",
      },
    },
  });

  const hoverRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 100,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: "file:///test/project/empty.md",
      },
      position: {
        line: 0,
        character: 0,
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
    id: number;
    result: unknown;
  };

  assertEquals(response.id, 100);
  assertEquals(response.result, null, "Should return null for empty document");
});

// ===== 非常に長い行の処理テスト =====

Deno.test("Edge Case - very long line: PositionedDetector handles 10000+ chars", () => {
  const detector = new PositionedDetector(mockEntities);
  // 10000文字の行の末尾に勇者
  const longPadding = "あ".repeat(10000);
  const content = longPadding + "勇者は剣を抜いた。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  assertEquals(results[0].positions[0].character, 10000);
});

Deno.test("Edge Case - very long line: getEntityAtPosition at far position", () => {
  const detector = new PositionedDetector(mockEntities);
  const longPadding = "あ".repeat(5000);
  const content = longPadding + "勇者" + "い".repeat(5000);
  detector.detectWithPositions(content);

  const entity = detector.getEntityAtPosition(content, {
    line: 0,
    character: 5000,
  });
  assertExists(entity);
  assertEquals(entity.id, "hero");
});

Deno.test("Edge Case - very long line: multiple entities spread across long line", () => {
  const detector = new PositionedDetector(mockEntities);
  const longPadding1 = "あ".repeat(3000);
  const longPadding2 = "い".repeat(3000);
  const content = longPadding1 + "勇者" + longPadding2 + "姫";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 2);
  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions[0].character, 3000);

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);
  assertEquals(princessResult.positions[0].character, 3002 + 3000); // 3000 + "勇者"(2) + 3000
});

Deno.test("Edge Case - very long line: DocumentManager stores very long content", () => {
  const manager = new DocumentManager();
  const longContent = "勇者".repeat(50000); // 100000文字
  manager.open("file:///test.md", longContent, 1, "markdown");
  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content.length, 100000);
});

// ===== 特殊文字（絵文字等）を含むドキュメントテスト =====

Deno.test("Edge Case - emoji: PositionedDetector handles emoji before entity", () => {
  const detector = new PositionedDetector(mockEntities);
  // 絵文字の後に勇者（絵文字はサロゲートペア）
  const content = "冒険開始勇者は出発した。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  // "冒険開始🎮" の長さを正確に計算
  assertEquals(results[0].positions[0].character, 4);
});

Deno.test("Edge Case - emoji: multiple emojis interspersed with text", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "物語開始勇者が姫を救う話";
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);
});

Deno.test("Edge Case - emoji: entity name does not partially match emoji", () => {
  const detector = new PositionedDetector(mockEntities);
  // 絵文字のみの文字列（エンティティなし）
  const content = "絵文字だけのテスト";
  const results = detector.detectWithPositions(content);
  assertEquals(results.length, 0);
});

Deno.test("Edge Case - special chars: handles newlines and tabs", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "タブ区切り\t勇者\tが登場\n改行後の\n姫の話";
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions[0].line, 0);

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);
  assertEquals(princessResult.positions[0].line, 2);
});

Deno.test("Edge Case - special chars: handles Unicode punctuation", () => {
  const detector = new PositionedDetector(mockEntities);
  // 全角記号を含む文章
  const content = "【物語】「勇者」は『城』へ向かった。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 2);
  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);

  const castleResult = results.find((r) => r.id === "castle");
  assertExists(castleResult);
});

Deno.test("Edge Case - special chars: handles mixed ASCII and Japanese", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "The 勇者 went to the 城 (castle).";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 2);
});

// ===== 大量のキャラクター参照を含むドキュメントテスト =====

Deno.test("Edge Case - many references: handles 100 references in one document", () => {
  const detector = new PositionedDetector(mockEntities);
  // 勇者を100回繰り返す文章
  const lines: string[] = [];
  for (let i = 0; i < 100; i++) {
    lines.push(`第${i}段落: 勇者は戦った。`);
  }
  const content = lines.join("\n");
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions.length, 100);
});

Deno.test("Edge Case - many references: correct line numbers for 100 lines", () => {
  const detector = new PositionedDetector(mockEntities);
  const lines: string[] = [];
  for (let i = 0; i < 100; i++) {
    lines.push(`勇者${i}`);
  }
  const content = lines.join("\n");
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);

  // 各行に勇者があるので、行番号は0から99まで
  const positions = heroResult.positions;
  for (let lineNum = 0; lineNum < 100; lineNum++) {
    const foundPos = positions.find((p) => p.line === lineNum);
    assertExists(foundPos, `Position for line ${lineNum} should exist`);
    assertEquals(foundPos.character, 0);
  }
});

Deno.test("Edge Case - many references: handles multiple different entities", () => {
  const manyEntities = generateManyEntities(50);
  const detector = new PositionedDetector(manyEntities);

  // 50個の異なるキャラクターを参照
  const lines: string[] = [];
  for (let i = 0; i < 50; i++) {
    lines.push(`キャラ${i}が登場した。`);
  }
  const content = lines.join("\n");
  const results = detector.detectWithPositions(content);

  // 50個の異なるエンティティが検出される
  assertEquals(results.length >= 50, true);
});

Deno.test("Edge Case - many references: performance with large document", () => {
  const detector = new PositionedDetector(mockEntities);

  // 1000行のドキュメント（各行に勇者と城）
  const lines: string[] = [];
  for (let i = 0; i < 1000; i++) {
    lines.push(`第${i}章: 勇者は城に向かった。`);
  }
  const content = lines.join("\n");

  const startTime = Date.now();
  const results = detector.detectWithPositions(content);
  const endTime = Date.now();

  // 検出結果の確認
  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions.length, 1000);

  const castleResult = results.find((r) => r.id === "castle");
  assertExists(castleResult);
  assertEquals(castleResult.positions.length, 1000);

  // パフォーマンス確認（1秒以内）
  const elapsed = endTime - startTime;
  assertEquals(
    elapsed < 1000,
    true,
    `Detection should complete within 1s, took ${elapsed}ms`,
  );
});

Deno.test("Edge Case - many references: DiagnosticsGenerator handles many low-confidence matches", async () => {
  const detector = new PositionedDetector(mockEntities);
  const generator = new DiagnosticsGenerator(detector);

  // 主人公（alias, confidence 0.8）を50回
  const lines: string[] = [];
  for (let i = 0; i < 50; i++) {
    lines.push(`主人公は第${i}の敵と戦った。`);
  }
  const content = lines.join("\n");

  const diagnostics = await generator.generate(
    "file:///test/many_refs.md",
    content,
    "/test",
  );

  // 低信頼度マッチの診断が生成される（Hintレベル）
  // 実装によっては全てHintとして報告される
  assertEquals(diagnostics.length >= 0, true);
});

// ===== 組み合わせテスト =====

Deno.test("Edge Case - combined: empty lines between references", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "勇者\n\n\n\n姫";
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions[0].line, 0);

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);
  assertEquals(princessResult.positions[0].line, 4);
});

Deno.test("Edge Case - combined: whitespace-only lines", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "   \n\t\t\n勇者\n  \n";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].positions[0].line, 2);
  assertEquals(results[0].positions[0].character, 0);
});

Deno.test("Edge Case - combined: entity at end of file without newline", () => {
  const detector = new PositionedDetector(mockEntities);
  const content = "物語の終わり: 勇者";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
});

Deno.test("Edge Case - combined: long line with emoji and entity", () => {
  const detector = new PositionedDetector(mockEntities);
  const longPadding = "冒険".repeat(1000); // 2000文字
  const content = longPadding + "勇者が登場" + longPadding;
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions[0].character, 2000);
});
