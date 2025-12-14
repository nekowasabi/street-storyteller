/**
 * 日本語パターンマッチャーテスト
 * Process5 Sub2: 基本助詞パターンの生成と信頼度計算のテスト
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  JapanesePatternMatcher,
  BASIC_PARTICLES,
} from "../../src/lsp/detection/japanese_pattern_matcher.ts";

Deno.test("BASIC_PARTICLES - contains 8 basic particles", () => {
  assertEquals(BASIC_PARTICLES.length, 8);
  assertEquals(BASIC_PARTICLES.includes("は"), true);
  assertEquals(BASIC_PARTICLES.includes("が"), true);
  assertEquals(BASIC_PARTICLES.includes("を"), true);
  assertEquals(BASIC_PARTICLES.includes("に"), true);
  assertEquals(BASIC_PARTICLES.includes("の"), true);
  assertEquals(BASIC_PARTICLES.includes("と"), true);
  assertEquals(BASIC_PARTICLES.includes("で"), true);
  assertEquals(BASIC_PARTICLES.includes("へ"), true);
});

Deno.test("JapanesePatternMatcher - expandWithParticles generates patterns", () => {
  const matcher = new JapanesePatternMatcher();

  const patterns = matcher.expandWithParticles("勇者");

  // 元のパターン + 8つの助詞パターン = 9パターン
  assertEquals(patterns.length, 9);
  assertEquals(patterns.includes("勇者"), true);
  assertEquals(patterns.includes("勇者は"), true);
  assertEquals(patterns.includes("勇者が"), true);
  assertEquals(patterns.includes("勇者を"), true);
  assertEquals(patterns.includes("勇者に"), true);
  assertEquals(patterns.includes("勇者の"), true);
  assertEquals(patterns.includes("勇者と"), true);
  assertEquals(patterns.includes("勇者で"), true);
  assertEquals(patterns.includes("勇者へ"), true);
});

Deno.test("JapanesePatternMatcher - findMatches finds all occurrences", () => {
  const matcher = new JapanesePatternMatcher();

  const content = "勇者は剣を抜いた。勇者が敵を倒した。";
  const matches = matcher.findMatches(content, "勇者");

  assertEquals(matches.length, 2);
  assertEquals(matches[0].position, 0);
  assertEquals(matches[0].length, 2);
  // "勇者は剣を抜いた。" = 9文字、2回目の勇者は位置9から
  assertEquals(matches[1].position, 9);
  assertEquals(matches[1].length, 2);
});

Deno.test("JapanesePatternMatcher - findMatches with particle pattern", () => {
  const matcher = new JapanesePatternMatcher();

  const content = "勇者は剣を抜いた。";
  const matches = matcher.findMatches(content, "勇者は");

  assertEquals(matches.length, 1);
  assertEquals(matches[0].position, 0);
  assertEquals(matches[0].length, 3);
});

Deno.test("JapanesePatternMatcher - calculateConfidence for subject position", () => {
  const matcher = new JapanesePatternMatcher();

  // "勇者は" - 主語位置（は）は高信頼度
  const content = "勇者は剣を抜いた。";
  const confidenceHa = matcher.calculateConfidence(content, "勇者", 0);
  assertEquals(confidenceHa >= 0.95, true, "主語位置は高信頼度");

  // "勇者が" - 主語位置（が）も高信頼度
  const content2 = "勇者が敵を倒した。";
  const confidenceGa = matcher.calculateConfidence(content2, "勇者", 0);
  assertEquals(confidenceGa >= 0.95, true, "主語位置は高信頼度");
});

Deno.test("JapanesePatternMatcher - calculateConfidence for object position", () => {
  const matcher = new JapanesePatternMatcher();

  // "勇者を" - 目的語位置
  const content = "敵は勇者を攻撃した。";
  const confidence = matcher.calculateConfidence(content, "勇者", 2);
  assertEquals(confidence >= 0.85 && confidence < 0.95, true, "目的語位置は中程度の信頼度");
});

Deno.test("JapanesePatternMatcher - calculateConfidence for other positions", () => {
  const matcher = new JapanesePatternMatcher();

  // "勇者の" - 所有格位置
  const content = "勇者の剣は強い。";
  const confidence = matcher.calculateConfidence(content, "勇者", 0);
  assertEquals(confidence >= 0.8, true, "所有格位置は中程度の信頼度");
});

Deno.test("JapanesePatternMatcher - addExcludePattern excludes matches", () => {
  const matcher = new JapanesePatternMatcher();

  // "勇者様" というパターンを除外
  matcher.addExcludePattern("勇者様");

  const content = "勇者様が登場した。勇者は戦った。";
  const matches = matcher.findMatches(content, "勇者");

  // "勇者様" の "勇者" は除外され、"勇者は" の "勇者" のみマッチ
  assertEquals(matches.length, 1);
  assertEquals(matches[0].position, 9);
});

Deno.test("JapanesePatternMatcher - handles empty content", () => {
  const matcher = new JapanesePatternMatcher();

  const matches = matcher.findMatches("", "勇者");
  assertEquals(matches.length, 0);
});

Deno.test("JapanesePatternMatcher - handles pattern not found", () => {
  const matcher = new JapanesePatternMatcher();

  const matches = matcher.findMatches("敵は攻撃した。", "勇者");
  assertEquals(matches.length, 0);
});

Deno.test("JapanesePatternMatcher - findMatchesWithConfidence returns combined results", () => {
  const matcher = new JapanesePatternMatcher();

  const content = "勇者は城に向かった。姫は勇者を待っていた。";
  const results = matcher.findMatchesWithConfidence(content, "勇者");

  assertEquals(results.length, 2);

  // 1回目: "勇者は" - 主語位置で高信頼度
  assertEquals(results[0].position, 0);
  assertEquals(results[0].confidence >= 0.95, true);

  // 2回目: "勇者を" - 目的語位置で中信頼度
  // "勇者は城に向かった。姫は" = 12文字、2回目の勇者は位置12から
  assertEquals(results[1].position, 12);
  assertEquals(results[1].confidence >= 0.85, true);
});

Deno.test("JapanesePatternMatcher - handles multiple exclude patterns", () => {
  const matcher = new JapanesePatternMatcher();

  matcher.addExcludePattern("勇者様");
  matcher.addExcludePattern("勇者殿");

  const content = "勇者様と勇者殿が、勇者を呼んだ。";
  const matches = matcher.findMatches(content, "勇者");

  // "勇者様" と "勇者殿" は除外、"勇者を" のみマッチ
  assertEquals(matches.length, 1);
});
