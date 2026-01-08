import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * 王子
 * 真実の愛を求める王国の王子
 */
export const prince: Character = {
  "id": "prince",
  "name": "王子",
  "role": "protagonist",
  "traits": [
    "誠実",
    "優雅",
    "ロマンチスト",
  ],
  "relationships": {
    "cinderella": "romantic",
    "king": "respect",
  },
  "appearingChapters": [],
  "summary": "真実の愛を求める王国の王子",
};
