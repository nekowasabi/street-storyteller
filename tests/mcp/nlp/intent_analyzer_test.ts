/**
 * IntentAnalyzerのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { IntentAnalyzer } from "../../../src/mcp/nlp/intent_analyzer.ts";

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
