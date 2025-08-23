import type { Character } from "../types/character.ts";

export const heroine: Character = {
  id: "heroine",
  name: "魔法使いエリーゼ",
  displayNames: ["エリーゼ", "魔法使い", "エリー"],
  aliases: ["エリー", "お嬢様"],
  pronouns: ["彼女"],
  role: "supporting",
  traits: ["自由奔放", "天才魔法使い", "好奇心旺盛", "少しわがまま"],
  relationships: {
    "hero": "romantic",
    "mentor": "respect",
    "rival": "neutral"
  },
  appearingChapters: ["chapter01", "chapter02", "chapter03"],
  
  summary: "王立魔法学院を首席で卒業した天才魔法使い。自由を求めて旅に出る。",
  
  details: {
    appearance: "銀色の長い髪に、エメラルドグリーンの瞳。華奢な体型だが、魔力は計り知れない。",
    personality: { $ref: "./heroine.details.md#personality" },
    backstory: { $ref: "./heroine.details.md#backstory" },
    development: {
      initial: "わがままな貴族の令嬢",
      goal: "真の意味での自由と責任を理解する",
      obstacle: "過保護な環境で育った甘さ",
      resolution: "仲間と共に成長し、他者を思いやる心を育む"
    }
  },
  
  detectionHints: {
    commonPatterns: [
      "エリーゼは", "エリーゼが", "エリーゼの",
      "魔法使いは", "魔法使いが",
      "エリーは", "「.*」とエリーゼ"
    ],
    excludePatterns: [
      "他の魔法使い", "魔法使いたち", "宮廷魔法使い"
    ],
    requiresContext: false,
    confidence: 0.85
  }
};