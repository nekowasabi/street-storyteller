// 自動生成: storyteller meta generate
// 生成日時: 2025-01-01 00:00:00

// storyteller:auto:imports:start
import type { ChapterMeta } from "../src/types/chapter.ts";
import { oldChar } from "../src/characters/old_char.ts";
// storyteller:auto:imports:end

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  // storyteller:auto:core:start
  title: "古いタイトル",
  order: 99,
  // storyteller:auto:core:end
  // storyteller:auto:entities:start
  characters: [oldChar],
  settings: [],
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
    "古": oldChar,
  },
  // storyteller:auto:references:end
};
