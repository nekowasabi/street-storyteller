import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * シンデレラ
 * 継母にいじめられながらも優しさを失わない少女
 */
export const cinderella: Character = {
  "id": "cinderella",
  "name": "シンデレラ",
  "role": "protagonist",
  "traits": [
    "優しい",
    "忍耐強い",
    "美しい",
    "夢見がち",
  ],
  "relationships": {
    "stepmother": "enemy",
    "stepsister_elder": "enemy",
    "stepsister_younger": "enemy",
    "fairy_godmother": "ally",
    "prince": "romantic",
  },
  "appearingChapters": [],
  "summary": "継母にいじめられながらも優しさを失わない少女",
  "details": {
    "description": { "file": "./cinderella_description.md" },
  },
};
