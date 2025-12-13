export type PresetType =
  | "battle-scene"
  | "romance-scene"
  | "dialogue"
  | "exposition";

export type PresetValidationType =
  | "character_presence"
  | "setting_consistency"
  | "plot_advancement"
  | "custom";

export interface PresetValidationRule {
  readonly type: PresetValidationType;
  readonly validate: string;
  readonly message: string;
}

export interface Preset {
  readonly type: PresetType;
  readonly validations: readonly PresetValidationRule[];
}

const PRESETS: Record<PresetType, Preset> = {
  "battle-scene": {
    type: "battle-scene",
    validations: [
      {
        type: "plot_advancement",
        validate:
          `(content: string) => {\n          const hasBattle = content.includes("戦") || content.includes("戦い") || content.includes("剣");\n          return hasBattle;\n        }`,
        message: "戦闘シーンの要素（戦い/剣など）が不足しています",
      },
    ],
  },
  "romance-scene": {
    type: "romance-scene",
    validations: [
      {
        type: "plot_advancement",
        validate:
          `(content: string) => {\n          const hasRomance = content.includes("恋") || content.includes("愛") || content.includes("想い");\n          return hasRomance;\n        }`,
        message: "恋愛シーンの要素（恋/愛など）が不足しています",
      },
    ],
  },
  "dialogue": {
    type: "dialogue",
    validations: [
      {
        type: "plot_advancement",
        validate:
          `(content: string) => {\n          const hasDialogue = content.includes("「") && content.includes("」");\n          return hasDialogue;\n        }`,
        message: "会話シーンの要素（「...」）が不足しています",
      },
    ],
  },
  "exposition": {
    type: "exposition",
    validations: [
      {
        type: "plot_advancement",
        validate:
          `(content: string) => {\n          // TODO: 説明・導入シーン向けの検証を追加してください\n          return true;\n        }`,
        message: "導入（説明）シーンの検証を追加してください",
      },
    ],
  },
};

export function getPreset(type: PresetType): Preset {
  return PRESETS[type];
}
