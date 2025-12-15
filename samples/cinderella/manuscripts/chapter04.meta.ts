// 自動生成: storyteller meta generate
// 生成日時: 2025-12-15 16:00:13

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { cinderella } from "../src/characters/cinderella.ts";
import { king } from "../src/characters/king.ts";
import { prince } from "../src/characters/prince.ts";
import { stepmother } from "../src/characters/stepmother.ts";
import { stepsister_elder } from "../src/characters/stepsister_elder.ts";
import { stepsister_younger } from "../src/characters/stepsister_younger.ts";
import { castle } from "../src/settings/castle.ts";
import { glass_slipper } from "../src/settings/glass_slipper.ts";
import { kingdom } from "../src/settings/kingdom.ts";
import { mansion } from "../src/settings/mansion.ts";
// storyteller:auto:imports:end

export const chapter04Meta: ChapterMeta = {
  id: "chapter04",
  // storyteller:auto:core:start
  title: "ガラスの靴",
  order: 4,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [cinderella, prince, stepmother, king, stepsister_younger, stepsister_elder],
  settings: [kingdom, castle, glass_slipper, mansion],
  // storyteller:auto:entities:end

  validations: [
    {
      type: "character_presence",
      validate: (content: string) => content.includes("シンデレラ"),
      message: "キャラクター（cinderella）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("王子"),
      message: "キャラクター（prince）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("継母"),
      message: "キャラクター（stepmother）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("国王"),
      message: "キャラクター（king）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("アナスタシア"),
      message: "キャラクター（stepsister_younger）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("ドリゼラ"),
      message: "キャラクター（stepsister_elder）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => content.includes("王国") || content.includes("フェアリーテイル") || content.includes("王都"),
      message: "設定（kingdom）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => content.includes("城") || content.includes("王城") || content.includes("お城"),
      message: "設定（castle）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => content.includes("ガラスの靴") || content.includes("靴"),
      message: "設定（glass_slipper）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => content.includes("屋敷"),
      message: "設定（mansion）が章内に登場していません",
    },
    {
      type: "plot_advancement",
      validate: (content: string) => {
        // TODO: プロット進行の検証ルールを追加してください
        return true;
      },
      message: "TODO: 重要なプロットポイントが不足しています",
    },
    {
      type: "custom",
      validate: (content: string) => {
        // TODO: カスタム検証ルールを追加してください
        return true;
      },
      message: "TODO: カスタム検証ルールを追加してください",
    },
  ],

  // storyteller:auto:references:start
  references: {
    "アナスタシア": stepsister_younger,
    "お城": castle,
    "ガラスの靴": glass_slipper,
    "シンデレラ": cinderella,
    "ドリゼラ": stepsister_elder,
    "フェアリーテイル": kingdom,
    "国王": king,
    "城": castle,
    "屋敷": mansion,
    "王国": kingdom,
    "王城": castle,
    "王子": prince,
    "王都": kingdom,
    "継母": stepmother,
    "靴": glass_slipper,
  },
  // storyteller:auto:references:end
};
