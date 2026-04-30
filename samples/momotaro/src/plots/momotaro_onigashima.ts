import type { Plot } from "@storyteller/types/v2/plot.ts";

export const momotaroOnigashima: Plot = {
  id: "momotaro_onigashima",
  name: "鬼ヶ島討伐",
  type: "main",
  status: "active",
  summary: "桃太郎が仲間とともに鬼ヶ島へ向かい、鬼を討つまでの主軸プロット。",
  beats: [
    {
      id: "allies_join",
      title: "仲間集結",
      summary: "犬・猿・雉がきびだんごを受け取り、桃太郎に同行する。",
      structurePosition: "setup",
      chapter: "chapter_02",
      characters: ["桃太郎", "犬", "猿", "雉"],
      settings: ["山道"],
    },
    {
      id: "final_battle",
      title: "鬼ヶ島の決戦",
      summary: "鬼の大将との戦いに勝利し、村へ平和を取り戻す。",
      structurePosition: "climax",
      chapter: "chapter_03",
      characters: ["桃太郎", "鬼の大将", "犬", "猿", "雉"],
      settings: ["鬼ヶ島"],
    },
    {
      id: "return_home",
      title: "凱旋",
      summary: "宝を持ち帰り、おじいさんとおばあさんに戦果を報告する。",
      structurePosition: "resolution",
      chapter: "chapter_04",
      characters: ["桃太郎", "おじいさん", "おばあさん"],
      settings: ["おじいさんの家"],
    },
  ],
  focusCharacters: {
    桃太郎: "primary",
    犬: "secondary",
    猿: "secondary",
    雉: "secondary",
  },
  importance: "major",
};
