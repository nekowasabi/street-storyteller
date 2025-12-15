/**
 * IntentAnalyzerのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 *
 * パターン拡張: 3個 → 20+個
 * - キャラクター関連: 5個
 * - 設定関連: 3個
 * - メタデータ関連: 3個
 * - LSP/検証関連: 3個
 * - ビュー/表示関連: 3個
 * - プロジェクト管理関連: 3個
 */
import { assertEquals } from "@std/assert";
import { IntentAnalyzer } from "../../../src/mcp/nlp/intent_analyzer.ts";

// =====================================================
// 既存テスト（維持）
// =====================================================

Deno.test("IntentAnalyzer: 「キャラクターを作って」→ element_create", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("キャラクターを作って");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
});

Deno.test("IntentAnalyzer: 「メタデータをチェックして」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("メタデータをチェックして");
  assertEquals(intent.action, "meta_check");
});

Deno.test("IntentAnalyzer: 「原稿の整合性を確認」→ lsp_validate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("原稿の整合性を確認");
  assertEquals(intent.action, "lsp_validate");
});

Deno.test("IntentAnalyzer: confidenceが0.0-1.0の範囲", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("キャラクターを作って");
  assertEquals(intent.confidence >= 0.0 && intent.confidence <= 1.0, true);
});

// =====================================================
// キャラクター関連パターン（5個）
// =====================================================

Deno.test("IntentAnalyzer: 「登場人物を追加」→ element_create (character)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("登場人物を追加");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「主人公を追加して」→ element_create (character)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("主人公を追加して");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「ヒロインを作成」→ element_create (character)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("ヒロインを作成");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「敵キャラを追加」→ element_create (character)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("敵キャラを追加");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「新しいキャラ作って」→ element_create (character)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("新しいキャラ作って");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// 設定関連パターン（3個）
// =====================================================

Deno.test("IntentAnalyzer: 「設定を確認」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("設定を確認");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「世界観を作成」→ element_create (setting)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("世界観を作成");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "setting");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「舞台を追加して」→ element_create (setting)", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("舞台を追加して");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "setting");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// メタデータ関連パターン（3個）
// =====================================================

Deno.test("IntentAnalyzer: 「frontmatterを検証」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("frontmatterを検証");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「章情報をチェック」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("章情報をチェック");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「メタ情報を確認して」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("メタ情報を確認して");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// LSP/検証関連パターン（3個）
// =====================================================

Deno.test("IntentAnalyzer: 「検証を実行」→ lsp_validate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("検証を実行");
  assertEquals(intent.action, "lsp_validate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「診断を開始」→ lsp_validate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("診断を開始");
  assertEquals(intent.action, "lsp_validate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「参照を検索」→ lsp_find_references", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("参照を検索");
  assertEquals(intent.action, "lsp_find_references");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// ビュー/表示関連パターン（3個）
// =====================================================

Deno.test("IntentAnalyzer: 「プロジェクトを表示」→ view_browser", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("プロジェクトを表示");
  assertEquals(intent.action, "view_browser");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「ビューを開いて」→ view_browser", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("ビューを開いて");
  assertEquals(intent.action, "view_browser");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「可視化して」→ view_browser", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("可視化して");
  assertEquals(intent.action, "view_browser");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// プロジェクト管理関連パターン（3個）
// =====================================================

Deno.test("IntentAnalyzer: 「プロジェクトを初期化」→ meta_generate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("プロジェクトを初期化");
  assertEquals(intent.action, "meta_generate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「初期化して」→ meta_generate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("初期化して");
  assertEquals(intent.action, "meta_generate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「バージョン確認」→ meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("バージョン確認");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// 追加パターン（合計20+確保）
// =====================================================

Deno.test("IntentAnalyzer: 「キャラクター一覧を表示」→ view_browser", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("キャラクター一覧を表示");
  assertEquals(intent.action, "view_browser");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「参照先を探して」→ lsp_find_references", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("参照先を探して");
  assertEquals(intent.action, "lsp_find_references");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「整合性チェック」→ lsp_validate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("整合性チェック");
  assertEquals(intent.action, "lsp_validate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「新規プロジェクト作成」→ meta_generate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("新規プロジェクト作成");
  assertEquals(intent.action, "meta_generate");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: 「設定ファイルを生成」→ meta_generate", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("設定ファイルを生成");
  assertEquals(intent.action, "meta_generate");
  assertEquals(intent.confidence > 0.8, true);
});

// =====================================================
// エッジケース・バウンダリテスト
// =====================================================

Deno.test("IntentAnalyzer: 空文字列 → unknown", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("");
  assertEquals(intent.action, "unknown");
  assertEquals(intent.confidence, 0.0);
});

Deno.test("IntentAnalyzer: 認識できない入力 → unknown", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("今日の天気は？");
  assertEquals(intent.action, "unknown");
  assertEquals(intent.confidence, 0.0);
});

Deno.test("IntentAnalyzer: 大文字小文字混在 frontmatter → meta_check", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("FrontMatterを確認して");
  assertEquals(intent.action, "meta_check");
  assertEquals(intent.confidence > 0.8, true);
});

Deno.test("IntentAnalyzer: スペース含む入力も処理できる", () => {
  const analyzer = new IntentAnalyzer();
  const intent = analyzer.analyze("  キャラクターを作って  ");
  assertEquals(intent.action, "element_create");
  assertEquals(intent.params.type, "character");
});
