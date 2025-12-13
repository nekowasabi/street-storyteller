import type { Term } from "../types/term.ts";

export const adventurerGuild: Term = {
  id: "adventurer_guild",
  name: "冒険者ギルド",
  displayNames: ["冒険者ギルド", "ギルド", "冒険者組合"],
  category: "organization",

  summary: "冒険者の登録・管理と依頼の仲介を行う国際的組織。",

  details: {
    description: "大陸全土に支部を持つ、冒険者支援のための巨大組織。",
    origin: "300年前の魔族大侵攻後、各国が協力して設立。",
    usage: "冒険者は登録することで、公式な依頼を受けられる。",
    relatedTerms: ["guild_rank", "quest_board", "guild_card"],
  },

  constraints: {
    appearingChapters: ["chapter01", "chapter04", "chapter07"],
  },

  detectionHints: {
    commonPatterns: [
      "冒険者ギルド",
      "ギルド",
      "ギルドで",
      "ギルドの受付",
    ],
    contextRequired: false,
    confidence: 0.85,
  },
};
