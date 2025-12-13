import type { Character } from "../types/character.ts";

export const mentor: Character = {
  id: "mentor",
  name: "剣聖ガイウス",
  displayNames: ["ガイウス", "師匠", "剣聖", "老剣士"],
  aliases: ["師", "老師"],
  pronouns: ["彼", "老人"],
  role: "supporting",
  traits: ["経験豊富", "厳格", "慈愛深い", "秘密を抱える"],
  relationships: {
    "hero": "mentor",
    "heroine": "respect",
    "rival": "neutral",
  },
  appearingChapters: ["chapter02", "chapter03"],

  summary:
    "かつて魔王と戦った伝説の剣士。今は隠居しているが、勇者の成長を導く。",

  details: {
    appearance:
      "白髪に深い皺が刻まれた顔。しかし、その瞳は未だ鋭い光を宿している。",
    personality:
      "厳しくも温かい指導者。過去の失敗から、次世代の育成に人生を捧げている。",
    backstory: { $ref: "./mentor.details.md#backstory" },
    development: {
      initial: "過去に囚われた隠居者",
      goal: "次世代に希望を託す",
      obstacle: "過去の失敗への後悔",
      resolution: "アレクスの成長を見届け、過去と和解",
    },
  },

  detectionHints: {
    commonPatterns: [
      "ガイウスは",
      "ガイウスが",
      "師匠は",
      "師匠が",
      "剣聖は",
      "老剣士は",
      "老人は",
    ],
    excludePatterns: [
      "別の師匠",
      "他の剣聖",
    ],
    requiresContext: false,
    confidence: 0.88,
  },
};
