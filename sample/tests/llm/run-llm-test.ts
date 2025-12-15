#!/usr/bin/env -S deno run --allow-read

/**
 * LLMテスト実行スクリプト
 * 使用方法: deno run --allow-read run-llm-test.ts
 */

import { LLMTestRunner } from "./llm-test-runner.ts";
import { MockLLMProvider } from "./mock-llm-provider.ts";

// 色付きコンソール出力
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function printHeader() {
  console.log(colors.cyan + "\n" + "=".repeat(60) + colors.reset);
  console.log(
    colors.cyan + "   🤖 LLM-Based Natural Language Testing System" +
      colors.reset,
  );
  console.log(
    colors.cyan + "   物語品質の自然言語検証デモンストレーション" +
      colors.reset,
  );
  console.log(colors.cyan + "=".repeat(60) + colors.reset);

  console.log(
    colors.yellow + "\n⚠️  Note: This demo uses a mock LLM provider." +
      colors.reset,
  );
  console.log(
    colors.yellow +
      "In production, replace with actual LLM API (OpenAI, Claude, etc.)" +
      colors.reset,
  );
}

async function main() {
  printHeader();

  // テストファイルのパス
  const testSuiteFile =
    "/Users/takets/repos/street-storyteller/sample/tests/llm/chapter01.llm-test.yaml";
  const manuscriptFile =
    "/Users/takets/repos/street-storyteller/sample/manuscripts/chapter01.md";

  console.log(colors.blue + "\n📂 Test Configuration:" + colors.reset);
  console.log(`   Test Suite: ${testSuiteFile}`);
  console.log(`   Manuscript: ${manuscriptFile}`);

  // LLMプロバイダーを初期化（モック版）
  const llmProvider = new MockLLMProvider();

  // テストランナーを初期化
  const testRunner = new LLMTestRunner(llmProvider, false); // verbose=false

  try {
    // テストを実行
    console.log(colors.green + "\n🚀 Starting LLM Tests..." + colors.reset);
    console.log("-".repeat(60));

    const results = await testRunner.runTestSuite(
      testSuiteFile,
      manuscriptFile,
    );

    // 詳細レポートを生成
    generateDetailedReport(results);

    // 終了コードを決定
    const hasErrors = results.some((r) => !r.passed && r.severity === "error");
    if (hasErrors) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error(
      colors.red + "\n❌ Error running tests:" + colors.reset,
      error,
    );
    Deno.exit(1);
  }
}

/**
 * 詳細なレポートを生成
 */
function generateDetailedReport(results: any[]): void {
  console.log(colors.magenta + "\n" + "=".repeat(60) + colors.reset);
  console.log(colors.magenta + "📋 Detailed Analysis Report" + colors.reset);
  console.log(colors.magenta + "=".repeat(60) + colors.reset);

  // カテゴリー別に結果を整理
  const categories = {
    character: results.filter((r) =>
      r.testId.includes("character") || r.testId.includes("hero") ||
      r.testId.includes("heroine")
    ),
    emotional: results.filter((r) =>
      r.testId.includes("emotion") || r.testId.includes("meeting")
    ),
    worldbuilding: results.filter((r) =>
      r.testId.includes("setting") || r.testId.includes("atmosphere")
    ),
    writing: results.filter((r) =>
      r.testId.includes("dialogue") || r.testId.includes("show_dont_tell")
    ),
    plot: results.filter((r) =>
      r.testId.includes("plot") || r.testId.includes("pacing") ||
      r.testId.includes("foreshadowing") || r.testId.includes("opening")
    ),
    reader: results.filter((r) =>
      r.testId.includes("engagement") || r.testId.includes("immersion")
    ),
    overall: results.filter((r) =>
      r.testId.includes("quality") || r.testId.includes("theme")
    ),
  };

  // 各カテゴリーのレポート
  reportCategory("👥 Character Development", categories.character);
  reportCategory("💕 Emotional Consistency", categories.emotional);
  reportCategory("🌍 World Building", categories.worldbuilding);
  reportCategory("✍️ Writing Quality", categories.writing);
  reportCategory("📖 Plot & Structure", categories.plot);
  reportCategory("👁️ Reader Experience", categories.reader);
  reportCategory("🎯 Overall Assessment", categories.overall);

  // 改善提案のまとめ
  console.log(
    colors.yellow + "\n💡 Top Improvement Suggestions:" + colors.reset,
  );
  const allSuggestions = results
    .filter((r) => !r.passed && r.suggestions && r.suggestions.length > 0)
    .flatMap((r) => r.suggestions)
    .slice(0, 5);

  allSuggestions.forEach((suggestion, index) => {
    console.log(`   ${index + 1}. ${suggestion}`);
  });

  // 信頼度の統計
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) /
    results.length;
  const minConfidence = Math.min(...results.map((r) => r.confidence));
  const maxConfidence = Math.max(...results.map((r) => r.confidence));

  console.log(colors.blue + "\n📊 Confidence Statistics:" + colors.reset);
  console.log(`   Average: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(
    `   Range: ${(minConfidence * 100).toFixed(1)}% - ${
      (maxConfidence * 100).toFixed(1)
    }%`,
  );

  // 最終スコア（デモ用）
  const score = calculateOverallScore(results);
  console.log(colors.green + "\n🏆 Overall Quality Score:" + colors.reset);
  console.log(`   ${score}/10`);

  if (score >= 8) {
    console.log(
      colors.green + "   Excellent! Ready for publication." + colors.reset,
    );
  } else if (score >= 6) {
    console.log(
      colors.yellow + "   Good, but some improvements recommended." +
        colors.reset,
    );
  } else {
    console.log(colors.red + "   Needs significant revision." + colors.reset);
  }
}

/**
 * カテゴリー別レポート
 */
function reportCategory(title: string, tests: any[]): void {
  if (tests.length === 0) return;

  console.log(`\n${title}`);
  const passed = tests.filter((t) => t.passed).length;
  const total = tests.length;
  const percentage = (passed / total * 100).toFixed(0);

  const barLength = 20;
  const filledLength = Math.round(barLength * passed / total);
  const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

  console.log(`   ${bar} ${percentage}% (${passed}/${total})`);

  // 失敗したテストの詳細
  const failed = tests.filter((t) => !t.passed);
  if (failed.length > 0) {
    failed.forEach((test) => {
      const icon = test.severity === "error"
        ? "🔴"
        : test.severity === "warning"
        ? "🟡"
        : "🔵";
      console.log(`   ${icon} ${test.testName}`);
    });
  }
}

/**
 * 全体スコアを計算
 */
function calculateOverallScore(results: any[]): number {
  const weights = {
    error: 3,
    warning: 2,
    info: 1,
  };

  let score = 10;
  results.forEach((r) => {
    if (!r.passed) {
      const weight = weights[r.severity as keyof typeof weights] || 1;
      score -= weight * 0.3;
    }
  });

  return Math.max(0, Math.round(score * 10) / 10);
}

// メイン処理を実行
if (import.meta.main) {
  await main();
}
