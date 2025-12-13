import type { ChapterMeta } from "../src/types/chapter.ts";
import { hero } from "../src/characters/hero.ts";
import { heroine } from "../src/characters/heroine.ts";
import { mentor } from "../src/characters/mentor.ts";
import { magicForest } from "../src/settings/magic_forest.ts";

export const chapter02Meta: ChapterMeta = {
  id: "chapter02",
  title: "魔法の森の試練",
  order: 2,
  characters: [hero, heroine, mentor],
  settings: [magicForest],

  summary: "魔法の森で師匠ガイウスと出会い、真の強さを学ぶ。修行の始まり。",

  plotPoints: [
    "魔法の森への侵入",
    "精霊との遭遇と試練の提示",
    "迷いの小径での困難",
    "師匠ガイウスとの運命的な出会い",
    "最初の敗北と教訓",
    "修行の開始",
  ],

  // 章固有の検証ルール
  validations: [
    {
      type: "character_presence",
      validate: (content: string) => {
        // 師匠が必ず登場していることを確認
        return content.includes("ガイウス") || content.includes("師匠") ||
          content.includes("老剣士");
      },
      message: "師匠（ガイウス）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => {
        // 魔法の森が舞台として登場していることを確認
        return content.includes("魔法の森") ||
          content.includes("エンシェントフォレスト");
      },
      message: "設定（魔法の森）が章内に登場していません",
    },
    {
      type: "plot_advancement",
      validate: (content: string) => {
        // 修行シーンが含まれていることを確認
        const hasTraining = content.includes("修行") ||
          content.includes("教え") || content.includes("訓練");
        const hasMentor = content.includes("ガイウス") ||
          content.includes("師匠");
        return hasTraining && hasMentor;
      },
      message: "重要なプロットポイント（修行の開始）が不足しています",
    },
    {
      type: "custom",
      validate: async (content: string) => {
        // 精霊の登場を確認（オプショナル）
        if (content.includes("精霊")) {
          // 精霊が登場する場合、森の掟への言及があるべき
          return content.includes("試練") || content.includes("掟");
        }
        return true; // 精霊が登場しない場合はOK
      },
      message: "精霊が登場する場合は、試練や掟への言及が必要です",
    },
  ],

  // 参照マッピング（LSP用）
  references: {
    "勇者": hero,
    "アレクス": hero,
    "彼": hero, // 文脈依存
    "エリーゼ": heroine,
    "魔法使い": heroine,
    "エリー": heroine,
    "彼女": heroine, // 文脈依存
    "ガイウス": mentor,
    "師匠": mentor,
    "剣聖": mentor,
    "老剣士": mentor,
    "老人": mentor, // 文脈依存
    "魔法の森": magicForest,
    "エンシェントフォレスト": magicForest,
    "古の森": magicForest,
    "精霊の森": magicForest,
    "迷いの小径": magicForest,
  },
};
