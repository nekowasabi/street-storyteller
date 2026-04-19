import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const princeSearch: Subplot = {
  id: "prince_search",
  name: "王子の花嫁探し",
  type: "subplot",
  status: "active",
  summary: "王子が真の花嫁を探す旅。舞踏会での出会いから靴での確認まで",
  beats: [
    {
      id: "search_setup",
      title: "花嫁探しの悩み",
      summary: "王子は適切な花嫁を見つけられずにいる",
      structurePosition: "setup",
      chapter: "chapter_01",
      characters: ["prince"],
    },
    {
      id: "search_climax",
      title: "舞踏会での出会い",
      summary: "謎の美しい女性と踊り、心を奪われる",
      structurePosition: "climax",
      chapter: "chapter_03",
      characters: ["prince", "cinderella"],
    },
    {
      id: "search_resolution",
      title: "靴による探索",
      summary: "国中の女性にガラスの靴を試させ、シンデレラを見つける",
      structurePosition: "resolution",
      chapter: "chapter_05",
      characters: ["prince", "cinderella"],
    },
  ],
  focusCharacters: {
    prince: "primary",
    cinderella: "secondary",
  },
  importance: "major",
};
