import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

/**
 * シンデレラの優しさ
 * 象徴的な伏線 - 主人公の内面的美徳
 */
export const kindHeart: Foreshadowing = {
  id: "kind_heart",
  name: "シンデレラの優しさ",
  type: "symbol",
  summary:
    "虐待されても優しさを失わないシンデレラの美徳。最終的に幸せを掴む資格の象徴",
  planting: {
    chapter: "chapter_01",
    description: "継母に虐げられても、シンデレラは優しさを失わない姿が描かれる",
    eventId: "event_mistreatment",
  },
  status: "resolved",
  importance: "minor",
  resolutions: [
    {
      chapter: "chapter_06",
      description: "優しい心を持ち続けたシンデレラが王子と結ばれ、幸せを掴む",
      eventId: "event_happy_ending",
      completeness: 1.0,
    },
  ],
  relations: {
    characters: ["cinderella"],
    settings: ["mansion"],
  },
  displayNames: ["シンデレラの優しさ", "優しい心"],
};
