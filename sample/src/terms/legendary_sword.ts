import type { Item } from "../types/term.ts";

export const legendarySword: Item = {
  id: "legendary_sword",
  name: "黎明の剣",
  displayNames: ["黎明", "黎明の剣", "伝説の剣"],
  category: "item",
  
  summary: "勇者に授けられた伝説の剣。魔を払う力を持つ。",
  
  details: {
    description: { $ref: "./legendary_sword.details.md#description" },
    origin: { $ref: "./legendary_sword.details.md#origin" },
    usage: "正しき心を持つ者のみが真の力を引き出せる。",
    limitations: "邪な心を持つ者が持つと、剣自体が持ち主を拒絶する。",
    relatedTerms: ["hero_armor", "sacred_shield", "demon_slayer"]
  },
  
  itemProperties: {
    rarity: "legendary",
    value: 0,  // 値段がつけられない
    weight: 3,  // kg
    durability: 9999,  // ほぼ壊れない
    effects: [
      "対魔族ダメージ+50%",
      "闇属性耐性+30%",
      "勇気ステータス+10"
    ]
  },
  
  constraints: {
    usableBy: ["hero"],  // 勇者専用
    requiresCondition: "純粋な心と強い正義感",
    appearingChapters: ["chapter01", "chapter02", "chapter03", "final_chapter"]
  },
  
  detectionHints: {
    commonPatterns: [
      "黎明",
      "黎明の剣",
      "伝説の剣",
      "愛剣",
      "彼の剣"  // 文脈依存
    ],
    contextRequired: false,
    confidence: 0.9
  }
};