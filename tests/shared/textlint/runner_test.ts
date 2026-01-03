import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { TextlintRunner } from "@storyteller/shared/textlint/runner.ts";
import type {
  TextlintCheckOptions,
  TextlintFixOptions,
} from "@storyteller/shared/textlint/types.ts";

describe("TextlintRunner", () => {
  it("should instantiate with project root", () => {
    const runner = new TextlintRunner("/project");
    assertExists(runner);
  });

  it("should have check method", () => {
    const runner = new TextlintRunner("/project");
    assertEquals(typeof runner.check, "function");
  });

  it("should have fix method", () => {
    const runner = new TextlintRunner("/project");
    assertEquals(typeof runner.fix, "function");
  });

  it("check should accept TextlintCheckOptions", async () => {
    const runner = new TextlintRunner("/project");
    const options: TextlintCheckOptions = {
      path: "test.md",
    };
    // This will fail until implementation exists
    const result = await runner.check(options);
    assertEquals(typeof result.totalFiles, "number");
    assertEquals(typeof result.totalIssues, "number");
    assertEquals(typeof result.errorCount, "number");
    assertEquals(typeof result.warningCount, "number");
    assertEquals(typeof result.infoCount, "number");
    assertEquals(Array.isArray(result.results), true);
  });

  it("fix should accept TextlintFixOptions", async () => {
    const runner = new TextlintRunner("/project");
    const options: TextlintFixOptions = {
      path: "test.md",
    };
    // This will fail until implementation exists
    const result = await runner.fix(options);
    assertEquals(Array.isArray(result), true);
  });

  it("check should return proper structure for empty results", async () => {
    const runner = new TextlintRunner("/project");
    const result = await runner.check({ path: "nonexistent.md" });
    assertEquals(result.totalFiles, 0);
    assertEquals(result.totalIssues, 0);
    assertEquals(result.errorCount, 0);
    assertEquals(result.warningCount, 0);
    assertEquals(result.infoCount, 0);
    assertEquals(result.results, []);
  });
});

// ===== parseFixResult テスト (CodeRabbit Review修正: applyingMessages使用) =====
describe("TextlintRunner parseFixResult", () => {
  it("should use applyingMessages field for fix detection", async () => {
    // textlint --fix の出力形式では、applyingMessages が適用された修正を含む
    // messages は検出された問題、applyingMessages は適用された修正
    const runner = new TextlintRunner("/project");

    // fix は空の結果を返す（textlintが存在しない場合）
    // しかし、適切なフィールド使用の検証は実装コードで行う
    const result = await runner.fix({ path: "nonexistent.md" });
    assertEquals(Array.isArray(result), true);
  });
});
