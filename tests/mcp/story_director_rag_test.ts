/**
 * story_director プロンプト RAG統合テスト
 * Process 60: MCP統合
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildSearchQuery,
  mapFocusToTag,
} from "@storyteller/mcp/prompts/definitions/story_director.ts";

Deno.test("mapFocusToTag - character → character", () => {
  const tag = mapFocusToTag("character");
  assertEquals(tag, "character");
});

Deno.test("mapFocusToTag - setting → setting", () => {
  const tag = mapFocusToTag("setting");
  assertEquals(tag, "setting");
});

Deno.test("mapFocusToTag - plot → manuscript", () => {
  const tag = mapFocusToTag("plot");
  assertEquals(tag, "manuscript");
});

Deno.test("mapFocusToTag - foreshadowing → foreshadowing", () => {
  const tag = mapFocusToTag("foreshadowing");
  assertEquals(tag, "foreshadowing");
});

Deno.test("mapFocusToTag - 不正な値は undefined", () => {
  const tag = mapFocusToTag("invalid");
  assertEquals(tag, undefined);
});

Deno.test("mapFocusToTag - undefined は undefined", () => {
  const tag = mapFocusToTag();
  assertEquals(tag, undefined);
});

Deno.test("buildSearchQuery - 基本的なクエリ構築", () => {
  const query = buildSearchQuery("キャラクター間の関係性を考えたい");
  assertStringIncludes(query, "キャラクター");
  assertStringIncludes(query, "関係性");
});

Deno.test("buildSearchQuery - search_hint を含める", () => {
  const query = buildSearchQuery("プロット構成について", "三幕構成");
  assertStringIncludes(query, "プロット");
  assertStringIncludes(query, "三幕構成");
});

Deno.test("buildSearchQuery - search_hint のみ", () => {
  const query = buildSearchQuery("", "伏線の回収");
  assertStringIncludes(query, "伏線");
});

Deno.test("buildSearchQuery - 長いクエリは適切に処理", () => {
  const longQuestion =
    "このキャラクターの成長過程を設定に基づいて考えたい場合、どのような視点が重要ですか";
  const query = buildSearchQuery(longQuestion);
  // クエリは質問から自動生成される
  assertEquals(typeof query, "string");
});
