// 自動生成: storyteller meta generate
// 生成日時: 2025-12-15 16:00:13

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

  // storyteller:auto:references:start
  references: {
    "シンデレラ": cinderella,
    "屋敷": mansion,
  },
  // storyteller:auto:references:end
};
