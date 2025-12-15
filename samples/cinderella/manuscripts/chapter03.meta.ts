// 自動生成: storyteller meta generate
// 生成日時: 2025-12-15 16:00:13

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { cinderella } from "../src/characters/cinderella.ts";
import { fairy_godmother } from "../src/characters/fairy_godmother.ts";
import { prince } from "../src/characters/prince.ts";
import { castle } from "../src/settings/castle.ts";
import { glass_slipper } from "../src/settings/glass_slipper.ts";
import { magic_system } from "../src/settings/magic_system.ts";
// storyteller:auto:imports:end

export const chapter03Meta: ChapterMeta = {
  id: "chapter03",
  // storyteller:auto:core:start
  title: "真夜中の魔法",
  order: 3,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [cinderella, prince, fairy_godmother],
  settings: [castle, magic_system, glass_slipper],
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
      validate: (content: string) => content.includes("妖精のおばあさん"),
      message: "キャラクター（fairy_godmother）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) =>
        content.includes("城") || content.includes("王城") ||
        content.includes("お城"),
      message: "設定（castle）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) =>
        content.includes("魔法") || content.includes("妖精魔法"),
      message: "設定（magic_system）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) =>
        content.includes("ガラスの靴") || content.includes("靴"),
      message: "設定（glass_slipper）が章内に登場していません",
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
    "お城": castle,
    "ガラスの靴": glass_slipper,
    "シンデレラ": cinderella,
    "城": castle,
    "妖精のおばあさん": fairy_godmother,
    "妖精魔法": magic_system,
    "王城": castle,
    "王子": prince,
    "靴": glass_slipper,
    "魔法": magic_system,
  },
  // storyteller:auto:references:end
};
