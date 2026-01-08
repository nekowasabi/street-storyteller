// src/application/view/consistency/consistency_checker.ts
import type { ConsistencyIssue } from "./types.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

/**
 * 整合性ルールのインターフェース
 */
export interface ConsistencyRule {
  /** ルール名 */
  readonly name: string;
  /** 整合性チェックを実行 */
  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[];
}

/**
 * 整合性チェッカー
 *
 * プロジェクトデータの整合性を検証し、問題を検出する
 */
export class ConsistencyChecker {
  private rules: ConsistencyRule[] = [];

  /**
   * ルールを追加する
   * @param rule 追加する整合性ルール
   */
  addRule(rule: ConsistencyRule): void {
    this.rules.push(rule);
  }

  /**
   * 整合性チェックを実行する
   * @param analysis プロジェクト解析結果
   * @returns 検出された問題の配列
   */
  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const rule of this.rules) {
      const ruleIssues = rule.check(analysis);
      issues.push(...ruleIssues);
    }

    return issues;
  }
}
