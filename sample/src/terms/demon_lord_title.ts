import type { Term } from "../types/term.ts";

export const demonLordTitle: Term = {
  id: "demon_lord_title",
  name: "魔王",
  displayNames: ["魔王", "暗黒の支配者", "闇の帝王", "魔界の王"],
  category: "title",
  
  summary: "魔界と魔族を統べる最高位の称号。世界に定期的に現れ、混沌をもたらす存在。",
  
  details: {
    description: "千年周期で復活する、世界の均衡を乱す存在に与えられる称号。",
    origin: "世界創造時に生まれた「原初の闇」が人格を持った時から存在する。",
    usage: "配下の魔族は「魔王様」と呼び、人間は恐怖を込めて「魔王」と呼ぶ。",
    limitations: "魔王の称号は同時に一人しか存在できない。",
    variations: ["大魔王", "魔皇", "冥王"],
    relatedTerms: ["four_demon_generals", "dark_castle", "demon_army"]
  },
  
  constraints: {
    appearingChapters: ["prologue", "chapter10", "chapter15", "final_chapter"]
  },
  
  detectionHints: {
    commonPatterns: [
      "魔王",
      "魔王が",
      "魔王の",
      "魔王様",
      "暗黒の支配者",
      "あの方"  // 魔族が使う敬称
    ],
    contextRequired: false,
    confidence: 0.95
  }
};