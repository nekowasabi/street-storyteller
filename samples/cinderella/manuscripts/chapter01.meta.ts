// 自動生成: storyteller meta generate
// 生成日時: 2025-12-15 16:00:13

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { cinderella } from "../src/characters/cinderella.ts";
import { stepmother } from "../src/characters/stepmother.ts";
import { stepsister_elder } from "../src/characters/stepsister_elder.ts";
import { stepsister_younger } from "../src/characters/stepsister_younger.ts";
import { mansion } from "../src/settings/mansion.ts";
// storyteller:auto:imports:end

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  // storyteller:auto:core:start
  title: "灰かぶり姫の日常",
  order: 1,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [cinderella, stepmother, stepsister_elder, stepsister_younger],
  settings: [mansion],
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
      type: "setting_consistency",
      validate: (content: string) => content.includes("屋敷") || content.includes("邸宅") || content.includes("お屋敷"),
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
    "お屋敷": mansion,
    "シンデレラ": cinderella,
    "ドリゼラ": stepsister_elder,
    "屋敷": mansion,
    "継母": stepmother,
    "邸宅": mansion,
  },
  // storyteller:auto:references:end
};
