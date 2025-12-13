import type { DetectedEntity, DetectionResult } from "./reference_detector.ts";

export interface ValidationRule {
  readonly type:
    | "character_presence"
    | "setting_consistency"
    | "plot_advancement"
    | "custom";
  readonly validate: string;
  readonly message?: string;
}

export class ValidationGenerator {
  generate(detected: DetectionResult): ValidationRule[] {
    const validations: ValidationRule[] = [];

    for (const character of detected.characters) {
      validations.push(createPresenceRule("character_presence", character, {
        entityLabel: "キャラクター",
      }));
    }

    for (const setting of detected.settings) {
      validations.push(createPresenceRule("setting_consistency", setting, {
        entityLabel: "設定",
      }));
    }

    validations.push({
      type: "plot_advancement",
      validate:
        `(content: string) => {\n        // TODO: プロット進行の検証ルールを追加してください\n        return true;\n      }`,
      message: "TODO: 重要なプロットポイントが不足しています",
    });

    validations.push({
      type: "custom",
      validate:
        `(content: string) => {\n        // TODO: カスタム検証ルールを追加してください\n        return true;\n      }`,
      message: "TODO: カスタム検証ルールを追加してください",
    });

    return validations;
  }
}

function createPresenceRule(
  type: "character_presence" | "setting_consistency",
  entity: DetectedEntity,
  options: { entityLabel: string },
): ValidationRule {
  const patterns = (entity.matchedPatterns && entity.matchedPatterns.length > 0)
    ? Array.from(new Set(entity.matchedPatterns))
    : [entity.id];

  const includesChecks = patterns
    .map((pattern) => `content.includes(${JSON.stringify(pattern)})`)
    .join(" || ");

  return {
    type,
    validate: `(content: string) => ${includesChecks}`,
    message: `${options.entityLabel}（${entity.id}）が章内に登場していません`,
  };
}
