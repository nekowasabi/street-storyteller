import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * 国王
 * 王子の父、威厳ある国王
 */
export const king: Character = {
  "id": "king",
  "name": "国王",
  "role": "guest",
  "traits": [
    "威厳がある",
    "息子思い",
  ],
  "relationships": {
    "prince": "ally",
  },
  "appearingChapters": [],
  "summary": "王子の父、威厳ある国王",
};
