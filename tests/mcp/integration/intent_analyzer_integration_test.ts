/**
 * MCP Intent Analyzer統合テスト
 * Process10 Sub3: 複雑な自然言語入力に対する正しいIntent解析
 *
 * テストシナリオ:
 * 1. キャラクター作成関連の自然言語入力
 * 2. 設定関連の自然言語入力
 * 3. メタデータ関連の自然言語入力
 * 4. LSP/検証関連の自然言語入力
 * 5. ビュー/表示関連の自然言語入力
 * 6. プロジェクト管理関連の自然言語入力
 * 7. 複合的な入力や曖昧な入力の処理
 * 8. IntentAnalyzerとCommandMapperの連携
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type Intent,
  IntentAnalyzer,
} from "../../../src/mcp/nlp/intent_analyzer.ts";
import { CommandMapper } from "../../../src/mcp/nlp/command_mapper.ts";

// ===== キャラクター作成関連テスト =====

Deno.test("Integration - Intent Analyzer: character creation patterns", () => {
  const analyzer = new IntentAnalyzer();

  const characterCreationInputs = [
    "キャラクターを作成してください",
    "登場人物を追加したい",
    "主人公を作って",
    "ヒロインを作成する",
    "敵キャラを追加して",
    "新しいキャラクターを追加",
    "キャラを作る",
  ];

  for (const input of characterCreationInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "element_create",
      `Input "${input}" should map to element_create`,
    );
    assertEquals(
      intent.params.type,
      "character",
      `Input "${input}" should have type=character`,
    );
    assertEquals(
      intent.confidence >= 0.8,
      true,
      `Input "${input}" should have high confidence`,
    );
  }
});

// ===== 設定関連テスト =====

Deno.test("Integration - Intent Analyzer: setting creation patterns", () => {
  const analyzer = new IntentAnalyzer();

  const settingCreationInputs = [
    "世界観を作成してください",
    "舞台を追加したい",
    "背景設定を作る",
    "場所を作成して",
  ];

  for (const input of settingCreationInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "element_create",
      `Input "${input}" should map to element_create`,
    );
    assertEquals(
      intent.params.type,
      "setting",
      `Input "${input}" should have type=setting`,
    );
  }
});

// ===== メタデータ関連テスト =====

Deno.test("Integration - Intent Analyzer: meta check patterns", () => {
  const analyzer = new IntentAnalyzer();

  const metaCheckInputs = [
    "メタデータをチェックして",
    "frontmatterを検証して",
    "フロントマターの確認をお願いします",
    "メタ情報をチェック",
    "章情報を検証して",
  ];

  for (const input of metaCheckInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "meta_check",
      `Input "${input}" should map to meta_check`,
    );
    assertEquals(
      intent.confidence >= 0.8,
      true,
      `Input "${input}" should have high confidence`,
    );
  }
});

// ===== LSP/検証関連テスト =====

Deno.test("Integration - Intent Analyzer: LSP validation patterns", () => {
  const analyzer = new IntentAnalyzer();

  const lspValidateInputs = [
    "原稿の整合性をチェックして",
    "文章を診断して",
    "ファイルの整合性確認をお願いします",
    "検証を実行して",
    "診断を開始する",
  ];

  for (const input of lspValidateInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "lsp_validate",
      `Input "${input}" should map to lsp_validate`,
    );
  }
});

Deno.test("Integration - Intent Analyzer: LSP find references patterns", () => {
  const analyzer = new IntentAnalyzer();

  const findReferencesInputs = [
    "参照を検索して",
    "リファレンスを探して",
    "どこで使われているか確認",
    "参照先を見つけて",
  ];

  for (const input of findReferencesInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "lsp_find_references",
      `Input "${input}" should map to lsp_find_references`,
    );
  }
});

// ===== ビュー/表示関連テスト =====

Deno.test("Integration - Intent Analyzer: view browser patterns", () => {
  const analyzer = new IntentAnalyzer();

  const viewBrowserInputs = [
    "一覧を表示して",
    "リストを見せて",
    "プロジェクトを表示",
    "キャラクターを見る",
    "ビューを開いて",
    "可視化して",
  ];

  for (const input of viewBrowserInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "view_browser",
      `Input "${input}" should map to view_browser`,
    );
  }
});

// ===== プロジェクト管理関連テスト =====

Deno.test("Integration - Intent Analyzer: project management patterns", () => {
  const analyzer = new IntentAnalyzer();

  const projectManagementInputs = [
    "プロジェクトを初期化して",
    "新規プロジェクトを作成",
    "初期化してください",
    "設定ファイルを生成して",
  ];

  for (const input of projectManagementInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "meta_generate",
      `Input "${input}" should map to meta_generate`,
    );
  }
});

// ===== 未知のパターンテスト =====

Deno.test("Integration - Intent Analyzer: unknown patterns return unknown action", () => {
  const analyzer = new IntentAnalyzer();

  const unknownInputs = [
    "こんにちは",
    "今日の天気は？",
    "ランダムな文章",
    "何かを何かにする",
    "",
    "   ",
  ];

  for (const input of unknownInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "unknown",
      `Input "${input}" should map to unknown`,
    );
    assertEquals(
      intent.confidence,
      0.0,
      `Unknown input "${input}" should have confidence 0`,
    );
  }
});

// ===== CommandMapperとの連携テスト =====

Deno.test("Integration - Intent Analyzer + CommandMapper: element_create maps correctly", () => {
  const analyzer = new IntentAnalyzer();
  const mapper = new CommandMapper();

  const intent = analyzer.analyze("キャラクターを作成して");
  const tool = mapper.mapToTool(intent);

  assertEquals(tool, "element_create");
});

Deno.test("Integration - Intent Analyzer + CommandMapper: unknown intent maps to null", () => {
  const analyzer = new IntentAnalyzer();
  const mapper = new CommandMapper();

  const intent = analyzer.analyze("ランダムな入力");
  const tool = mapper.mapToTool(intent);

  assertEquals(tool, null);
});

Deno.test("Integration - Intent Analyzer + CommandMapper: parameter normalization", () => {
  const analyzer = new IntentAnalyzer();
  const mapper = new CommandMapper();

  const intent = analyzer.analyze("キャラクターを作成して");
  const params = mapper.normalizeParams(intent);

  assertEquals(params.type, "character");
});

// ===== 信頼度テスト =====

Deno.test("Integration - Intent Analyzer: confidence levels are appropriate", () => {
  const analyzer = new IntentAnalyzer();

  // High confidence patterns (explicit keywords)
  const highConfidenceInputs = [
    { input: "キャラクターを作成して", expectedMinConfidence: 0.9 },
    { input: "メタデータをチェックして", expectedMinConfidence: 0.9 },
    { input: "プロジェクトを初期化", expectedMinConfidence: 0.9 },
    { input: "一覧を表示して", expectedMinConfidence: 0.9 },
  ];

  for (const { input, expectedMinConfidence } of highConfidenceInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.confidence >= expectedMinConfidence,
      true,
      `Input "${input}" should have confidence >= ${expectedMinConfidence}, got ${intent.confidence}`,
    );
  }
});

Deno.test("Integration - Intent Analyzer: confidence is clamped between 0 and 1", () => {
  const analyzer = new IntentAnalyzer();

  // Test various inputs to ensure confidence is always in valid range
  const testInputs = [
    "キャラクターを作成",
    "メタデータチェック",
    "未知の入力",
    "",
    "very long input ".repeat(100),
  ];

  for (const input of testInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.confidence >= 0 && intent.confidence <= 1,
      true,
      `Confidence for "${
        input.slice(0, 50)
      }..." should be between 0 and 1, got ${intent.confidence}`,
    );
  }
});

// ===== パターン優先度テスト =====

Deno.test("Integration - Intent Analyzer: view patterns take priority over others", () => {
  const analyzer = new IntentAnalyzer();

  // "表示" を含む入力は view_browser が優先される
  const intent = analyzer.analyze("キャラクター一覧を表示して");
  assertEquals(intent.action, "view_browser");
});

Deno.test("Integration - Intent Analyzer: specific patterns match before generic ones", () => {
  const analyzer = new IntentAnalyzer();

  // "主人公を作って" は generic "作って" より specific "主人公" が先にマッチ
  const intent = analyzer.analyze("主人公を作って");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
});

// ===== 複合的な入力テスト =====

Deno.test("Integration - Intent Analyzer: handles complex multi-clause inputs", () => {
  const analyzer = new IntentAnalyzer();

  // 複数のアクションを含む入力（最初のマッチが優先）
  const complexInputs = [
    {
      input: "一覧を表示してから、新しいキャラクターを作成したい",
      expectedAction: "view_browser", // 「表示」が先にマッチ
    },
    {
      input: "キャラクターを作成して、メタデータをチェックしてください",
      expectedAction: "element_create", // 「キャラクター...作成」が先にマッチ
    },
  ];

  for (const { input, expectedAction } of complexInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      expectedAction,
      `Complex input "${input}" should map to ${expectedAction}`,
    );
  }
});

Deno.test("Integration - Intent Analyzer: handles polite forms", () => {
  const analyzer = new IntentAnalyzer();

  const politeInputs = [
    { input: "キャラクターを作成してください", expected: "element_create" },
    { input: "メタデータをチェックしていただけますか", expected: "meta_check" },
    { input: "一覧を表示していただけませんか", expected: "view_browser" },
  ];

  for (const { input, expected } of politeInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      expected,
      `Polite input "${input}" should map to ${expected}`,
    );
  }
});

// ===== エッジケーステスト =====

Deno.test("Integration - Intent Analyzer: handles whitespace variations", () => {
  const analyzer = new IntentAnalyzer();

  const whitespaceInputs = [
    "  キャラクターを作成して  ",
    "\tキャラクターを作成して\t",
    "キャラクター　を　作成して", // 全角スペース
  ];

  for (const input of whitespaceInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(
      intent.action,
      "element_create",
      `Input with whitespace "${input}" should still map correctly`,
    );
  }
});

Deno.test("Integration - Intent Analyzer: empty and whitespace-only inputs", () => {
  const analyzer = new IntentAnalyzer();

  const emptyInputs = ["", "   ", "\t", "\n", "  \t\n  "];

  for (const input of emptyInputs) {
    const intent = analyzer.analyze(input);
    assertEquals(intent.action, "unknown");
    assertEquals(intent.confidence, 0.0);
  }
});

// ===== 全アクションタイプのカバレッジテスト =====

Deno.test("Integration - Intent Analyzer: all action types are reachable", () => {
  const analyzer = new IntentAnalyzer();

  const actionCoverage = new Map<string, string>();

  // 各アクションタイプに対応する入力をテスト
  const testCases = [
    { input: "キャラクターを作成", action: "element_create" },
    { input: "メタデータをチェック", action: "meta_check" },
    { input: "原稿の整合性チェック", action: "lsp_validate" },
    { input: "参照を検索", action: "lsp_find_references" },
    { input: "一覧を表示", action: "view_browser" },
    { input: "プロジェクトを初期化", action: "meta_generate" },
  ];

  for (const { input, action } of testCases) {
    const intent = analyzer.analyze(input);
    actionCoverage.set(action, input);
    assertEquals(
      intent.action,
      action,
      `Action ${action} should be reachable via "${input}"`,
    );
  }

  // 全ての期待されるアクションがカバーされていることを確認
  const expectedActions = [
    "element_create",
    "meta_check",
    "lsp_validate",
    "lsp_find_references",
    "view_browser",
    "meta_generate",
  ];

  for (const action of expectedActions) {
    assertEquals(
      actionCoverage.has(action),
      true,
      `Action ${action} should be covered by tests`,
    );
  }
});

// ===== 完全なE2Eワークフローテスト =====

Deno.test("Integration - Intent Analyzer: complete E2E workflow", () => {
  const analyzer = new IntentAnalyzer();
  const mapper = new CommandMapper();

  // ユーザーの自然言語入力から、ツール呼び出しまでの完全フロー
  const workflow = [
    {
      userInput: "新しいキャラクターを追加したいです",
      expectedAction: "element_create",
      expectedTool: "element_create",
      expectedParams: { type: "character" },
    },
    {
      userInput: "メタデータの整合性を確認してください",
      expectedAction: "meta_check",
      expectedTool: "meta_check",
      expectedParams: {},
    },
    {
      userInput: "プロジェクトの一覧を見せてください",
      expectedAction: "view_browser",
      expectedTool: "view_browser",
      expectedParams: {},
    },
  ];

  for (const step of workflow) {
    // 1. 自然言語をIntent解析
    const intent = analyzer.analyze(step.userInput);
    assertEquals(
      intent.action,
      step.expectedAction,
      `Step "${step.userInput}" should produce action ${step.expectedAction}`,
    );

    // 2. IntentをToolにマッピング
    const tool = mapper.mapToTool(intent);
    assertEquals(
      tool,
      step.expectedTool,
      `Step "${step.userInput}" should map to tool ${step.expectedTool}`,
    );

    // 3. パラメータを正規化
    const params = mapper.normalizeParams(intent);
    for (const [key, value] of Object.entries(step.expectedParams)) {
      assertEquals(
        params[key],
        value,
        `Step "${step.userInput}" param ${key} should be ${value}`,
      );
    }
  }
});
