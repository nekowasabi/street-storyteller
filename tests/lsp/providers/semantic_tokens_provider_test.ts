/**
 * セマンティックトークンプロバイダーテスト
 * Process3: SemanticTokensProvider実装テスト
 *
 * TDD Red Phase: プロバイダーの基本機能テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティ
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
    displayNames: ["姫", "プリンセス"],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    filePath: "src/settings/castle.ts",
  },
];

// ===== 基本構造テスト =====

Deno.test("SemanticTokensProvider - can be instantiated", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  assertExists(provider);
});

Deno.test("SemanticTokensProvider - getSemanticTokens returns SemanticTokens", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const result = provider.getSemanticTokens("file:///test.md", "", "/project");

  assertExists(result);
  assertExists(result.data);
  assertEquals(Array.isArray(result.data), true);
});

Deno.test("SemanticTokensProvider - empty content returns empty data", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const result = provider.getSemanticTokens("file:///test.md", "", "/project");

  assertEquals(result.data.length, 0);
});

// ===== キャラクター検出テスト =====

Deno.test("SemanticTokensProvider - detects character name", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "勇者は冒険を始めた。";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // data配列は5要素ごとにトークンを表す
  // [line_delta, char_delta, length, token_type, modifier_mask]
  assertEquals(result.data.length >= 5, true);

  // 最初のトークン
  assertEquals(result.data[0], 0); // line_delta (最初の行)
  assertEquals(result.data[1], 0); // char_delta (行頭)
  assertEquals(result.data[2], 2); // length ("勇者"は2文字)
  assertEquals(result.data[3], 0); // token_type (character = 0)
});

// ===== 設定検出テスト =====

Deno.test("SemanticTokensProvider - detects setting name", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "城に向かった。";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  assertEquals(result.data[3], 1); // token_type (setting = 1)
});

// ===== 複数トークンテスト =====

Deno.test("SemanticTokensProvider - handles multiple tokens on same line", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "勇者と姫が出会った。";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // 2つのトークン = 10要素
  assertEquals(result.data.length >= 10, true);

  // 最初のトークン（勇者）
  assertEquals(result.data[0], 0); // line_delta
  assertEquals(result.data[1], 0); // char_delta
  assertEquals(result.data[2], 2); // length

  // 2番目のトークン（姫）- char_deltaは前トークンからの差分
  assertEquals(result.data[5], 0); // line_delta (同じ行)
  // char_deltaは"勇者と"の後 = 3文字目から
  assertEquals(result.data[6], 3); // char_delta (勇者の後ろから姫までの差分)
  assertEquals(result.data[7], 1); // length
});

Deno.test("SemanticTokensProvider - handles tokens on different lines", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "勇者は冒険を始めた。\n城に向かった。";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 10, true);

  // 最初のトークン（勇者）
  assertEquals(result.data[0], 0); // line_delta (0行目)

  // 2番目のトークン（城）
  assertEquals(result.data[5], 1); // line_delta (1行下)
  assertEquals(result.data[6], 0); // char_delta (行頭)
});

// ===== モディファイアテスト =====

Deno.test("SemanticTokensProvider - high confidence modifier", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "勇者"はname直接マッチで信頼度1.0 → highConfidence (bit 0)
  const content = "勇者";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  // modifier_mask: bit 0 = highConfidence
  assertEquals(result.data[4] & 1, 1);
});

Deno.test("SemanticTokensProvider - medium confidence modifier for alias", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "主人公"はaliasマッチで信頼度0.8 → mediumConfidence (bit 1)
  const content = "主人公";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  // modifier_mask: bit 1 = mediumConfidence
  assertEquals(result.data[4] & 2, 2);
});

// ===== 範囲トークンテスト =====

Deno.test("SemanticTokensProvider - getSemanticTokensRange returns tokens in range", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "勇者は冒険を始めた。\n城に向かった。\n姫を助けた。";
  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 100 },
  };

  const result = provider.getSemanticTokensRange(
    "file:///test.md",
    content,
    range,
    "/project",
  );

  // 範囲内（0行目）のトークンのみ = 勇者のみ
  assertEquals(result.data.length, 5);
});

Deno.test("SemanticTokensProvider - getSemanticTokensRange excludes out-of-range tokens", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  const content = "勇者は冒険を始めた。\n城に向かった。\n姫を助けた。";
  const range = {
    start: { line: 1, character: 0 },
    end: { line: 1, character: 100 },
  };

  const result = provider.getSemanticTokensRange(
    "file:///test.md",
    content,
    range,
    "/project",
  );

  // 範囲内（1行目）のトークンのみ = 城のみ
  assertEquals(result.data.length, 5);
  // LSP仕様: 絶対位置を維持。1行目のトークンなのでline_deltaは1（0行目からの差分）
  assertEquals(result.data[0], 1);
});

// ===== 日本語（マルチバイト）テスト =====

Deno.test("SemanticTokensProvider - Japanese: correct character position for multibyte", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "勇者"は位置0から始まり、長さ2
  const content = "勇者";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data[0], 0); // line
  assertEquals(result.data[1], 0); // character (位置0)
  assertEquals(result.data[2], 2); // length (2文字)
});

Deno.test("SemanticTokensProvider - Japanese: middle of line detection", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "あいう勇者えお" - "勇者"は位置3から始まる
  const content = "あいう勇者えお";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data[0], 0); // line
  assertEquals(result.data[1], 3); // character (位置3)
  assertEquals(result.data[2], 2); // length (2文字)
});

Deno.test("SemanticTokensProvider - Japanese: mixed Japanese and ASCII", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "ABC勇者DEF" - "勇者"は位置3から始まる
  const content = "ABC勇者DEF";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data[0], 0); // line
  assertEquals(result.data[1], 3); // character (位置3)
  assertEquals(result.data[2], 2); // length (2文字)
});

Deno.test("SemanticTokensProvider - Japanese: multiple entities in Japanese text", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // "勇者と姫が城で会った" - 勇者(0), 姫(3), 城(5)
  const content = "勇者と姫が城で会った";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // 3つのトークン = 15要素
  assertEquals(result.data.length, 15);

  // 最初: 勇者
  assertEquals(result.data[0], 0); // line
  assertEquals(result.data[1], 0); // character
  assertEquals(result.data[2], 2); // length
  assertEquals(result.data[3], 0); // type (character)

  // 2番目: 姫 (char_deltaは勇者の位置0から姫の位置3までの差分)
  assertEquals(result.data[5], 0); // line
  assertEquals(result.data[6], 3); // char_delta
  assertEquals(result.data[7], 1); // length

  // 3番目: 城 (char_deltaは姫の位置3から城の位置5までの差分)
  assertEquals(result.data[10], 0); // line
  assertEquals(result.data[11], 2); // char_delta
  assertEquals(result.data[12], 1); // length
  assertEquals(result.data[13], 1); // type (setting)
});

// ========================================
// process3: foreshadowingセマンティックトークンテスト
// ========================================

// 伏線を含むモックエンティティ
const mockEntitiesWithForeshadowing: DetectableEntity[] = [
  ...mockEntities,
  {
    kind: "foreshadowing" as const,
    id: "glass_slipper",
    name: "ガラスの靴の伏線",
    displayNames: ["ガラスの靴", "ガラスの靴の伏線"],
    aliases: ["輝く靴"],
    filePath: "src/foreshadowings/glass_slipper.ts",
    status: "planted" as const,
  },
  {
    kind: "foreshadowing" as const,
    id: "midnight_deadline",
    name: "真夜中の期限",
    displayNames: ["真夜中", "真夜中の期限"],
    aliases: ["12時"],
    filePath: "src/foreshadowings/midnight_deadline.ts",
    status: "resolved" as const,
  },
];

Deno.test("SemanticTokensProvider - detects foreshadowing token", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  const content = "ガラスの靴が光っていた。";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  assertEquals(result.data[2], 5); // length ("ガラスの靴" = 5文字)
  assertEquals(result.data[3], 2); // token_type (foreshadowing = 2)
});

Deno.test("SemanticTokensProvider - foreshadowing planted status modifier", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  // ガラスの靴は planted ステータス
  const content = "ガラスの靴";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  // planted modifier bit (bit 3 = 8)
  assertEquals((result.data[4] & 8) !== 0, true);
});

Deno.test("SemanticTokensProvider - foreshadowing resolved status modifier", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  // 真夜中 は resolved ステータス
  const content = "真夜中";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  assertEquals(result.data.length >= 5, true);
  // resolved modifier bit (bit 4 = 16)
  assertEquals((result.data[4] & 16) !== 0, true);
});

Deno.test("SemanticTokensProvider - mixed entities including foreshadowing", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  // "勇者はガラスの靴を城で見つけた"
  // 勇者(character=0), ガラスの靴(foreshadowing=2), 城(setting=1)
  const content = "勇者はガラスの靴を城で見つけた";
  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // 3つのトークン = 15要素
  assertEquals(result.data.length, 15);

  // 勇者 (character = 0)
  assertEquals(result.data[3], 0);

  // ガラスの靴 (foreshadowing = 2)
  assertEquals(result.data[8], 2);

  // 城 (setting = 1)
  assertEquals(result.data[13], 1);
});

// ========================================
// process10: 絶対位置維持と相対エンコーディングのテスト
// ========================================

Deno.test("SemanticTokensProvider - getSemanticTokensRange maintains absolute positions", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // 3行目（0-indexed: 行2）に「城」がある
  const content = "あいう\nかきく\n城に行った\nたちつ";
  const range = {
    start: { line: 2, character: 0 },
    end: { line: 3, character: 100 },
  };
  const result = provider.getSemanticTokensRange(
    "file:///test.md",
    content,
    range,
    "/project",
  );

  // LSP仕様: 「城」は絶対行番号2。最初のトークンなので0行目からの差分 = 2
  assertEquals(result.data[0], 2); // line_delta = 2
  assertEquals(result.data[1], 0); // character = 0 (行頭)
  assertEquals(result.data[2], 1); // length = 1
  assertEquals(result.data[3], 1); // token_type = setting
});

Deno.test("SemanticTokensProvider - getSemanticTokensRange with multiple tokens preserves relative encoding", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // 勇者は行1、城は行2
  const content = "はじめに\n勇者が登場\n城に到着\n終わり";
  const range = {
    start: { line: 1, character: 0 },
    end: { line: 2, character: 100 },
  };
  const result = provider.getSemanticTokensRange(
    "file:///test.md",
    content,
    range,
    "/project",
  );

  // 2つのトークン = 10要素
  assertEquals(result.data.length, 10);

  // 1つ目のトークン: 勇者（絶対行1、最初のトークンなので0行目からの差分 = 1）
  assertEquals(result.data[0], 1); // line_delta from 0
  assertEquals(result.data[1], 0); // character = 0 (行頭)
  assertEquals(result.data[2], 2); // length = 2
  assertEquals(result.data[3], 0); // token_type = character

  // 2つ目のトークン: 城（絶対行2、前のトークン行1からの差分 = 1）
  assertEquals(result.data[5], 1); // line_delta from previous
  assertEquals(result.data[6], 0); // character = 0 (行頭)
  assertEquals(result.data[7], 1); // length = 1
  assertEquals(result.data[8], 1); // token_type = setting
});

Deno.test("SemanticTokensProvider - getSemanticTokensRange with large line offset", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const provider = new SemanticTokensProvider(detector);

  // 行100にトークンがあるケース（スクロール時の典型的なシナリオ）
  const lines = Array(100).fill("空行").join("\n") +
    "\n勇者が現れた\n城が見えた";
  const range = {
    start: { line: 100, character: 0 },
    end: { line: 101, character: 100 },
  };
  const result = provider.getSemanticTokensRange(
    "file:///test.md",
    lines,
    range,
    "/project",
  );

  // 2つのトークン
  assertEquals(result.data.length, 10);

  // 勇者（絶対行100）
  assertEquals(result.data[0], 100); // line_delta = 100
  assertEquals(result.data[1], 0); // character

  // 城（絶対行101、前のトークンから1行下）
  assertEquals(result.data[5], 1); // line_delta from previous (101 - 100)
});

// ========================================
// process2: アノテーションからセマンティックトークン生成のテスト
// ========================================

Deno.test("SemanticTokensProvider - detects foreshadowing annotation comment", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  // HTMLコメントアノテーション
  const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
「魔法は真夜中に解けます」`;

  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // アノテーション行がトークンとして検出される
  assertEquals(result.data.length >= 5, true);
  // tokenType = 2 (foreshadowing)
  assertEquals(result.data[3], 2);
  // modifier includes planted (bit 3 = 8)
  assertEquals((result.data[4] & 8) !== 0, true);
});

Deno.test("SemanticTokensProvider - annotation resolved status modifier", async () => {
  const { SemanticTokensProvider } = await import(
    "../../../src/lsp/providers/semantic_tokens_provider.ts"
  );

  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new SemanticTokensProvider(detector);

  // resolved ステータスの伏線をアノテーションで指定
  const content = `<!-- @foreshadowing:真夜中の期限 -->
時計が鳴った`;

  const result = provider.getSemanticTokens(
    "file:///test.md",
    content,
    "/project",
  );

  // アノテーション行がトークンとして検出される
  assertEquals(result.data.length >= 5, true);
  // tokenType = 2 (foreshadowing)
  assertEquals(result.data[3], 2);
  // modifier includes resolved (bit 4 = 16)
  assertEquals((result.data[4] & 16) !== 0, true);
});
