import type { Setting } from "../types/setting.ts";

export const magicForest: Setting = {
  id: "magic_forest",
  name: "エンシェントフォレスト",
  displayNames: ["魔法の森", "エンシェントフォレスト", "古の森", "精霊の森"],
  type: "location",
  appearingChapters: ["chapter02", "chapter03"],
  
  summary: "古代から存在する神秘の森。強力な魔力に満ち、多くの魔法生物が生息する。",
  
  details: {
    geography: "王国の東に広がる広大な原生林。面積は東京都の約2倍。",
    history: "世界創造と共に生まれたとされる最古の森。",
    culture: { $ref: "./magic_forest.details.md#culture" },
    inhabitants: "精霊、妖精、魔法生物、そして森の守護者たち。",
    landmarks: { $ref: "./magic_forest.details.md#landmarks" }
  },
  
  relatedSettings: ["kingdom", "spirit_shrine"],
  
  detectionHints: {
    commonPatterns: [
      "魔法の森", "エンシェントフォレスト", "古の森",
      "精霊の森", "森の中", "深い森"
    ],
    excludePatterns: [
      "普通の森", "ただの森", "近くの森"
    ],
    confidence: 0.82
  }
};