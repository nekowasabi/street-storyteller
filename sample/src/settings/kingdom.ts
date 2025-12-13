import type { Setting } from "../types/setting.ts";

export const kingdom: Setting = {
  id: "kingdom",
  name: "エルフィード王国",
  displayNames: ["王国", "エルフィード", "王都", "首都"],
  type: "location",
  appearingChapters: ["chapter01", "chapter02"],

  summary: "千年の歴史を持つ大陸最大の王国。魔法と剣術が共存する文明国家。",

  details: {
    geography: { $ref: "./kingdom.details.md#geography" },
    history: { $ref: "./kingdom.details.md#history" },
    culture: "騎士道精神を重んじ、魔法と剣術の両方を尊重する文化。",
    politics: "立憲君主制。国王と議会が共同統治。",
    economy: "交易と農業が主産業。魔法道具の輸出も盛ん。",
    inhabitants: "人口約50万人。人間が8割、エルフ・ドワーフが2割。",
    landmarks: { $ref: "./kingdom.details.md#landmarks" },
  },

  relatedSettings: ["magic_forest", "ancient_ruins"],

  detectionHints: {
    commonPatterns: [
      "王国",
      "王都",
      "エルフィード",
      "首都",
      "城下町",
      "王城",
      "王宮",
    ],
    excludePatterns: [
      "隣国",
      "他国",
      "敵国",
    ],
    confidence: 0.85,
  },
};
