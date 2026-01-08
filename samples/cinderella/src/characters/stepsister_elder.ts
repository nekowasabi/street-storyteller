import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * ドリゼラ
 * 傲慢な姉義姉
 */
export const stepsister_elder: Character = {
  "id": "stepsister_elder",
  "name": "ドリゼラ",
  "role": "supporting",
  "traits": [
    "傲慢",
    "嫉妬深い",
  ],
  "relationships": {
    "cinderella": "enemy",
    "stepmother": "ally",
    "stepsister_younger": "ally",
  },
  "appearingChapters": [],
  "summary": "傲慢な姉義姉",
};
