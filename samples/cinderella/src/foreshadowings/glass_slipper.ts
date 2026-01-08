import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

/**
 * ガラスの靴
 * 物語の象徴的アイテム - チェーホフの銃パターン
 */
export const glassSlipper: Foreshadowing = {
  id: "glass_slipper",
  name: "ガラスの靴",
  type: "chekhov",
  summary: "魔法で与えられた特別な靴。後にシンデレラを見つける決め手となる",
  planting: {
    chapter: "chapter_02",
    description: "魔法による変身の際、特別なガラスの靴が与えられる",
    eventId: "event_transformation",
  },
  status: "resolved",
  importance: "major",
  resolutions: [
    {
      chapter: "chapter_05",
      description: "シンデレラの足にガラスの靴がぴったり合い、正体が判明する",
      eventId: "event_slipper_fits",
      completeness: 1.0,
    },
  ],
  relations: {
    characters: ["cinderella", "fairy_godmother", "prince"],
    settings: ["castle", "mansion"],
  },
  displayNames: ["ガラスの靴", "ガラスのスリッパ"],
};
