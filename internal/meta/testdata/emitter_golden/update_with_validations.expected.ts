// 自動生成: storyteller meta generate
// 生成日時: 2025-01-01 00:00:00

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { cinderella } from "../src/characters/cinderella.ts";
import { mansion } from "../src/settings/mansion.ts";
// storyteller:auto:imports:end

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  // storyteller:auto:core:start
  title: "灰かぶり姫の日常",
  order: 1,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [cinderella],
  settings: [mansion],
  // storyteller:auto:entities:end

  validations: [
    {
      type: "character_presence",
      validate: (content: string) => content.includes("シンデレラ"),
      message: "キャラクター（cinderella）が章内に登場していません",
    },
  ],

  // storyteller:auto:references:start
  references: {
    "シンデレラ": cinderella,
    "屋敷": mansion,
  },
  // storyteller:auto:references:end
};
