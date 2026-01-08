// src/application/view/consistency/rules/orphan_character_rule.ts
import type { ConsistencyRule } from "../consistency_checker.ts";
import type { ConsistencyIssue } from "../types.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

/**
 * 孤立キャラクター検出ルール
 *
 * 他のキャラクターとの関係性がないキャラクターを検出する
 */
export class OrphanCharacterRule implements ConsistencyRule {
  readonly name = "orphan-character";

  check(analysis: ProjectAnalysis): readonly ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // すべてのキャラクターIDを収集（将来の拡張用）
    const _characterIds = new Set(analysis.characters.map((c) => c.id));

    // 各キャラクターの関係を確認
    for (const character of analysis.characters) {
      const hasRelationship = character.relationships &&
        Object.keys(character.relationships).length > 0;

      // 他のキャラクターからの参照を確認
      const isReferencedByOthers = analysis.characters.some(
        (other) =>
          other.id !== character.id &&
          other.relationships &&
          character.id in other.relationships,
      );

      if (!hasRelationship && !isReferencedByOthers) {
        issues.push({
          id: `orphan-char-${character.id}`,
          type: "orphan_character",
          severity: "warning",
          message:
            `キャラクター '${character.name}' (${character.id}) は他のキャラクターと関係がありません`,
          entityId: character.id,
          entityType: "character",
          suggestion: "他のキャラクターとの関係性を追加してください",
        });
      }
    }

    return issues;
  }
}
