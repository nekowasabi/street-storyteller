import type { Plot } from "@storyteller/types/v2/plot.ts";

export const cinderellaGrowth: Plot = {
  id: "cinderella_growth",
  name: "シンデレラの成長",
  type: "main",
  status: "active",
  summary:
    "虐げられた従者から、自分の価値を認識し、王子に選ばれるまでの成長物語",
  beats: [
    {
      id: "growth_setup",
      title: "召使いとしての日常",
      summary: "継母と姉たちに虐げられる日々",
      structurePosition: "setup",
      chapter: "chapter_01",
      characters: ["cinderella", "stepmother"],
    },
    {
      id: "growth_rising",
      title: "舞踏会への招待",
      summary: "舞踏会の知らせが届くが、継母に行かせてもらえない",
      structurePosition: "rising",
      chapter: "chapter_02",
      characters: ["cinderella", "stepmother"],
    },
    {
      id: "growth_climax",
      title: "魔法の変身と舞踏会",
      summary: "妖精の魔法で変身し、舞踏会で王子と出会う",
      structurePosition: "climax",
      chapter: "chapter_03",
      characters: ["cinderella", "prince", "fairy_godmother"],
    },
    {
      id: "growth_falling",
      title: "ガラスの靴",
      summary: "深夜に逃げ去り、ガラスの靴を残す",
      structurePosition: "falling",
      chapter: "chapter_04",
      characters: ["cinderella"],
    },
    {
      id: "growth_resolution",
      title: "王妃への昇格",
      summary: "靴がぴったりと合い、王子と結ばれる",
      structurePosition: "resolution",
      chapter: "chapter_05",
      characters: ["cinderella", "prince"],
    },
  ],
  focusCharacters: {
    cinderella: "primary",
    prince: "secondary",
  },
  importance: "major",
};
