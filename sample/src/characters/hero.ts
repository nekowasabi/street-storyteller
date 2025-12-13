import type { Character } from "../types/character.ts";

export const hero: Character = {
  id: "hero",
  name: "勇者アレクス",
  displayNames: ["勇者", "アレクス", "勇者アレクス"],
  aliases: ["勇", "主人公"],
  pronouns: ["彼"],
  role: "protagonist",
  traits: ["勇敢", "正義感が強い", "やや天然", "剣術に長ける"],
  relationships: {
    "heroine": "romantic",
    "mentor": "respect",
    "rival": "competitive",
  },
  appearingChapters: ["chapter01", "chapter02", "chapter03"],

  summary: "正義感の強い青年騎士。村を救うため魔王討伐の旅に出る。",

  // 詳細はMarkdownファイルを参照
  details: {
    appearance: { $ref: "./hero.details.md#appearance" },
    personality: { $ref: "./hero.details.md#personality" },
    backstory: { $ref: "./hero.details.md#backstory" },
    development: {
      initial: "自信のない見習い騎士",
      goal: "真の勇者として世界を救う",
      obstacle: "過去のトラウマと自己不信",
      resolution: "仲間との絆を通じて真の強さを理解",
      arc_notes: { file: "./hero.details.md#character-arc" },
    },
  },

  // LSP用の検出ヒント
  detectionHints: {
    commonPatterns: [
      "勇者は",
      "勇者が",
      "勇者の",
      "勇者を",
      "勇者に",
      "アレクスは",
      "アレクスが",
      "アレクスの",
      "「.*」と勇者",
      "勇者は.*した",
      "勇者が.*した",
    ],
    excludePatterns: [
      "勇者という存在",
      "勇者とは何か",
      "勇者のような",
      "伝説の勇者",
      "かつての勇者",
    ],
    requiresContext: false,
    confidence: 0.9,
  },
};
