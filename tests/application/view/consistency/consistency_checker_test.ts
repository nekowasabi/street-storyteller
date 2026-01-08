// tests/application/view/consistency/consistency_checker_test.ts
import { assertEquals, assertExists } from "@std/assert";
import {
  ConsistencyChecker,
  type ConsistencyRule,
} from "@storyteller/application/view/consistency/consistency_checker.ts";
import type {
  ConsistencyIssue,
  IssueSeverity,
} from "@storyteller/application/view/consistency/types.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

const emptyAnalysis: ProjectAnalysis = {
  characters: [],
  settings: [],
  timelines: [],
  foreshadowings: [],
  manuscripts: [],
};

Deno.test("ConsistencyChecker - 基盤", async (t) => {
  await t.step("ConsistencyCheckerクラスが存在する", () => {
    const checker = new ConsistencyChecker();
    assertExists(checker);
  });

  await t.step("checkメソッドがConsistencyIssue配列を返す", () => {
    const checker = new ConsistencyChecker();
    const issues = checker.check(emptyAnalysis);
    assertEquals(Array.isArray(issues), true);
  });

  await t.step("空のデータでは問題が検出されない", () => {
    const checker = new ConsistencyChecker();
    const issues = checker.check(emptyAnalysis);
    assertEquals(issues.length, 0);
  });

  await t.step("ルールを追加できる", () => {
    const checker = new ConsistencyChecker();
    const mockRule: ConsistencyRule = {
      name: "mock-rule",
      check: () => [],
    };
    checker.addRule(mockRule);
    // ルール追加後もエラーなく実行できる
    const issues = checker.check(emptyAnalysis);
    assertEquals(issues.length, 0);
  });

  await t.step("ルールが問題を検出できる", () => {
    const checker = new ConsistencyChecker();
    const mockRule: ConsistencyRule = {
      name: "mock-rule",
      check: () => [
        {
          id: "issue_01",
          type: "orphan_character",
          severity: "warning" as IssueSeverity,
          message: "テスト問題",
        },
      ],
    };
    checker.addRule(mockRule);
    const issues = checker.check(emptyAnalysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].type, "orphan_character");
  });

  await t.step("複数のルールが実行される", () => {
    const checker = new ConsistencyChecker();
    const rule1: ConsistencyRule = {
      name: "rule-1",
      check: () => [
        {
          id: "issue_01",
          type: "orphan_character",
          severity: "warning" as IssueSeverity,
          message: "問題1",
        },
      ],
    };
    const rule2: ConsistencyRule = {
      name: "rule-2",
      check: () => [
        {
          id: "issue_02",
          type: "missing_reference",
          severity: "error" as IssueSeverity,
          message: "問題2",
        },
      ],
    };
    checker.addRule(rule1);
    checker.addRule(rule2);
    const issues = checker.check(emptyAnalysis);
    assertEquals(issues.length, 2);
  });
});

Deno.test("ConsistencyIssue - 型定義", async (t) => {
  await t.step("ConsistencyIssue型が正しく構成できる", () => {
    const issue: ConsistencyIssue = {
      id: "issue_01",
      type: "orphan_character",
      severity: "warning",
      message: "キャラクター 'hero' は他のキャラクターと関係がありません",
      entityId: "hero",
      entityType: "character",
      suggestion: "関係性を追加してください",
    };
    assertEquals(issue.severity, "warning");
    assertEquals(issue.entityId, "hero");
  });

  await t.step("各IssueSeverityが使用できる", () => {
    const severities: IssueSeverity[] = ["error", "warning", "info"];
    for (const severity of severities) {
      const issue: ConsistencyIssue = {
        id: `issue_${severity}`,
        type: "orphan_character",
        severity,
        message: `${severity}レベルの問題`,
      };
      assertEquals(issue.severity, severity);
    }
  });
});
