/**
 * LLMベース自然言語テストランナー
 * 原稿の品質を自然言語で検証するテストシステム
 */

import { parse } from "@std/yaml";

// テスト定義の型
export interface LLMTest {
  id: string;
  name: string;
  assertion: string;
  expected: boolean;
  severity: "error" | "warning" | "info";
  evaluation_criteria?: string[];
  output_format?: "simple" | "detailed";
}

export interface LLMTestSuite {
  metadata: {
    chapter: string;
    title: string;
    test_suite: string;
    llm_model: string;
  };
  character_tests?: LLMTest[];
  emotional_tests?: LLMTest[];
  worldbuilding_tests?: LLMTest[];
  writing_quality_tests?: LLMTest[];
  plot_tests?: LLMTest[];
  reader_experience_tests?: LLMTest[];
  theme_tests?: LLMTest[];
  overall_evaluation?: LLMTest[];
}

// テスト結果の型
export interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  confidence: number;
  reasoning: string;
  suggestions?: string[];
  severity: string;
}

// LLMプロバイダーのインターフェース
export interface LLMProvider {
  analyze(prompt: string): Promise<LLMResponse>;
}

export interface LLMResponse {
  verdict: boolean;
  confidence: number;
  reasoning: string;
  suggestions?: string[];
  score?: number;
}

// LLMテストランナー
export class LLMTestRunner {
  constructor(
    private llmProvider: LLMProvider,
    private verbose: boolean = false,
  ) {}

  /**
   * テストスイートを実行
   */
  async runTestSuite(
    testSuiteFile: string,
    manuscriptFile: string,
  ): Promise<TestResult[]> {
    // テスト定義を読み込み
    const testSuiteYaml = await Deno.readTextFile(testSuiteFile);
    const testSuite = parse(testSuiteYaml) as LLMTestSuite;

    // 原稿を読み込み
    const manuscript = await Deno.readTextFile(manuscriptFile);

    console.log(`🚀 Running LLM tests for: ${testSuite.metadata.title}`);
    console.log(`📝 Using model: ${testSuite.metadata.llm_model}`);
    console.log("=".repeat(50));

    const results: TestResult[] = [];

    // 各カテゴリーのテストを実行
    const categories = [
      { name: "Character Tests", tests: testSuite.character_tests },
      { name: "Emotional Tests", tests: testSuite.emotional_tests },
      { name: "Worldbuilding Tests", tests: testSuite.worldbuilding_tests },
      { name: "Writing Quality Tests", tests: testSuite.writing_quality_tests },
      { name: "Plot Tests", tests: testSuite.plot_tests },
      {
        name: "Reader Experience Tests",
        tests: testSuite.reader_experience_tests,
      },
      { name: "Theme Tests", tests: testSuite.theme_tests },
      { name: "Overall Evaluation", tests: testSuite.overall_evaluation },
    ];

    for (const category of categories) {
      if (category.tests && category.tests.length > 0) {
        console.log(`\n📋 ${category.name}`);
        console.log("-".repeat(40));

        for (const test of category.tests) {
          const result = await this.runSingleTest(test, manuscript);
          results.push(result);
          this.printTestResult(result);
        }
      }
    }

    // サマリーを表示
    this.printSummary(results);

    return results;
  }

  /**
   * 単一のテストを実行
   */
  private async runSingleTest(
    test: LLMTest,
    manuscript: string,
  ): Promise<TestResult> {
    const prompt = this.buildPrompt(test, manuscript);

    if (this.verbose) {
      console.log("\n📝 Prompt:", prompt.substring(0, 200) + "...");
    }

    try {
      const response = await this.llmProvider.analyze(prompt);

      return {
        testId: test.id,
        testName: test.name,
        passed: response.verdict === test.expected,
        confidence: response.confidence,
        reasoning: response.reasoning,
        suggestions: response.suggestions,
        severity: test.severity,
      };
    } catch (error) {
      console.error(`❌ Error running test ${test.id}:`, error);
      return {
        testId: test.id,
        testName: test.name,
        passed: false,
        confidence: 0,
        reasoning: `Test execution failed: ${error}`,
        severity: test.severity,
      };
    }
  }

  /**
   * LLMへのプロンプトを構築
   */
  private buildPrompt(test: LLMTest, manuscript: string): string {
    const criteriaSection = test.evaluation_criteria
      ? `\n評価基準:\n${
        test.evaluation_criteria.map((c) => `- ${c}`).join("\n")
      }`
      : "";

    return `
あなたは物語の品質を評価する専門家です。以下の原稿を読んで、指定された観点で評価してください。

【原稿】
${manuscript}

【評価項目】
${test.assertion}
${criteriaSection}

【タスク】
1. 上記の評価項目について、原稿を詳細に分析してください
2. true（基準を満たしている）またはfalse（基準を満たしていない）で判定してください
3. 判定の理由を具体的に説明してください
4. 改善のための提案があれば提示してください

【出力形式】
以下のJSON形式で回答してください：
{
  "verdict": true または false,
  "confidence": 0.0から1.0の数値（判定の確信度）,
  "reasoning": "判定理由の詳細な説明",
  "suggestions": ["改善提案1", "改善提案2", ...]
}

必ずJSON形式で回答し、それ以外のテキストは含めないでください。
`;
  }

  /**
   * テスト結果を表示
   */
  private printTestResult(result: TestResult): void {
    const icon = result.passed ? "✅" : "❌";
    const severity = this.getSeverityIcon(result.severity);

    console.log(`${icon} ${severity} ${result.testName}`);

    if (!result.passed || this.verbose) {
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${result.reasoning.substring(0, 100)}...`);

      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`   💡 Suggestions:`);
        result.suggestions.forEach((s) => {
          console.log(`      - ${s}`);
        });
      }
    }
  }

  /**
   * 重要度アイコンを取得
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case "error":
        return "🔴";
      case "warning":
        return "🟡";
      case "info":
        return "🔵";
      default:
        return "⚪";
    }
  }

  /**
   * テスト結果のサマリーを表示
   */
  private printSummary(results: TestResult[]): void {
    console.log("\n" + "=".repeat(50));
    console.log("📊 Test Summary");
    console.log("=".repeat(50));

    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    const errors =
      results.filter((r) => !r.passed && r.severity === "error").length;
    const warnings =
      results.filter((r) => !r.passed && r.severity === "warning").length;
    const infos =
      results.filter((r) => !r.passed && r.severity === "info").length;

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) /
      total;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log(`   🔴 Errors: ${errors}`);
      console.log(`   🟡 Warnings: ${warnings}`);
      console.log(`   🔵 Info: ${infos}`);
    }

    console.log(`📈 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    // 全体の判定
    if (errors > 0) {
      console.log(
        "\n🚨 Critical issues found. Please fix errors before proceeding.",
      );
    } else if (warnings > 0) {
      console.log("\n⚠️  Some improvements recommended. Review warnings.");
    } else if (failed === 0) {
      console.log(
        "\n🎉 All tests passed! Your manuscript meets quality standards.",
      );
    } else {
      console.log("\n💡 Minor suggestions available for improvement.");
    }
  }
}
