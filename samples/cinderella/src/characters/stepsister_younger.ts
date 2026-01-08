import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * アナスタシア
 * わがままな妹義姉
 */
export const stepsister_younger: Character = {
  "id": "stepsister_younger",
  "name": "アナスタシア",
  "role": "supporting",
  "traits": [
    "わがまま",
    "短気",
  ],
  "relationships": {
    "cinderella": "enemy",
    "stepmother": "ally",
    "stepsister_elder": "ally",
  },
  "appearingChapters": [],
  "summary": "わがままな妹義姉",
};
