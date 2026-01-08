import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

/**
 * 真夜中の期限
 * 魔法の制約として告げられた予言的伏線
 */
export const midnightDeadline: Foreshadowing = {
  id: "midnight_deadline",
  name: "真夜中の期限",
  type: "prophecy",
  summary: "12時で魔法が解けるという制約。緊張感を生み、逃走の原因となる",
  planting: {
    chapter: "chapter_02",
    description: "妖精が「12時になると魔法が解ける」と警告する",
    eventId: "event_transformation",
  },
  status: "resolved",
  importance: "major",
  resolutions: [
    {
      chapter: "chapter_03",
      description: "12時の鐘が鳴り、シンデレラは慌てて逃げ出す",
      eventId: "event_midnight_escape",
      completeness: 1.0,
    },
  ],
  relations: {
    characters: ["cinderella", "fairy_godmother"],
    settings: ["castle"],
  },
  displayNames: ["真夜中の期限", "12時の期限", "魔法の期限"],
};
