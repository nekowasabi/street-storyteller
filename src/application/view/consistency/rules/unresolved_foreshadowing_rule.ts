// src/application/view/consistency/rules/unresolved_foreshadowing_rule.ts
import type { ConsistencyRule } from "../consistency_checker.ts";
import type { ConsistencyIssue } from "../types.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

/**
 * 未回収伏線検出ルール
 *
 * planted状態やpartially_resolved状態の伏線を検出する
 */
export class UnresolvedForeshadowingRule implements ConsistencyRule {
  readonly name = "unresolved-foreshadowing";

  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const foreshadowing of analysis.foreshadowings) {
      const status = foreshadowing.status;

      if (status === "planted") {
        issues.push({
          id: `unresolved-foreshadowing-${foreshadowing.id}`,
          type: "unresolved_foreshadowing",
          severity: "warning",
          message:
            `伏線 '${foreshadowing.name}' (${foreshadowing.id}) はまだ回収されていません`,
          entityId: foreshadowing.id,
          entityType: "foreshadowing",
          suggestion: "伏線の回収シーンを追加してください",
        });
      } else if (status === "partially_resolved") {
        issues.push({
          id: `partial-foreshadowing-${foreshadowing.id}`,
          type: "unresolved_foreshadowing",
          severity: "info",
          message:
            `伏線 '${foreshadowing.name}' (${foreshadowing.id}) は部分的に回収されています`,
          entityId: foreshadowing.id,
          entityType: "foreshadowing",
          suggestion: "完全な回収を検討してください",
        });
      } else if (status === "abandoned") {
        issues.push({
          id: `abandoned-foreshadowing-${foreshadowing.id}`,
          type: "unresolved_foreshadowing",
          severity: "info",
          message:
            `伏線 '${foreshadowing.name}' (${foreshadowing.id}) は放棄されています`,
          entityId: foreshadowing.id,
          entityType: "foreshadowing",
          suggestion: "意図的な放棄であれば問題ありません",
        });
      }
    }

    return issues;
  }
}
