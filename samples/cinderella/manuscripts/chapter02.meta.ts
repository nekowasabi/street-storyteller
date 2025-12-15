// 自動生成: storyteller meta generate
// 生成日時: 2025-12-15 16:00:13

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { cinderella } from "../src/characters/cinderella.ts";
import { fairy_godmother } from "../src/characters/fairy_godmother.ts";
import { prince } from "../src/characters/prince.ts";
import { stepmother } from "../src/characters/stepmother.ts";
import { stepsister_elder } from "../src/characters/stepsister_elder.ts";
import { stepsister_younger } from "../src/characters/stepsister_younger.ts";
import { kingdom } from "../src/settings/kingdom.ts";
import { magic_system } from "../src/settings/magic_system.ts";
import { mansion } from "../src/settings/mansion.ts";
// storyteller:auto:imports:end

export const chapter02Meta: ChapterMeta = {
  id: "chapter02",
  // storyteller:auto:core:start
  title: "舞踏会への招待",
  order: 2,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [
    cinderella,
    stepmother,
    stepsister_elder,
    stepsister_younger,
    fairy_godmother,
    prince,
  ],
  settings: [mansion, magic_system, kingdom],
  // storyteller:auto:entities:end

  validations: [
    {
      type: "character_presence",
      validate: (content: string) => content.includes("シンデレラ"),
      message: "キャラクター（cinderella）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("継母"),
      message: "キャラクター（stepmother）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("ドリゼラ"),
      message: "キャラクター（stepsister_elder）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("アナスタシア"),
      message: "キャラクター（stepsister_younger）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("妖精のおばあさん"),
      message: "キャラクター（fairy_godmother）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => content.includes("王子"),
      message: "キャラクター（prince）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) =>
        content.includes("屋敷") || content.includes("邸宅") ||
        content.includes("お屋敷"),
      message: "設定（mansion）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) =>
        content.includes("魔法") || content.includes("妖精魔法"),
      message: "設定（magic_system）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => content.includes("王国"),
      message: "設定（kingdom）が章内に登場していません",
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
    "お屋敷": mansion,
    "シンデレラ": cinderella,
    "ドリゼラ": stepsister_elder,
    "妖精のおばあさん": fairy_godmother,
    "妖精魔法": magic_system,
    "屋敷": mansion,
    "王国": kingdom,
    "王子": prince,
    "継母": stepmother,
    "邸宅": mansion,
    "魔法": magic_system,
  },
  // storyteller:auto:references:end
};
