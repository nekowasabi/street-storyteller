import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const stepsistersRivalry: Subplot = {
  id: "stepsisters_rivalry",
  name: "継姉妹の対立",
  type: "background",
  status: "active",
  summary: "継母の娘たちがシンデレラを虐げる背景にある嫉妬と競争",
  beats: [
    {
      id: "rivalry_setup",
      title: "家事の押し付け",
      summary: "継姉妹がシンデレラに全ての家事を押し付ける",
      structurePosition: "setup",
      chapter: "chapter_01",
      characters: ["stepsister_1", "stepsister_2", "cinderella"],
    },
    {
      id: "rivalry_climax",
      title: "舞踏会への嫉妬",
      summary: "シンデレラが舞踏会に行ったことを知り嫉妬する",
      structurePosition: "climax",
      chapter: "chapter_04",
      characters: ["stepsister_1", "stepsister_2", "stepmother"],
    },
  ],
  focusCharacters: {
    stepsister_1: "secondary",
    stepsister_2: "secondary",
  },
  importance: "minor",
};
