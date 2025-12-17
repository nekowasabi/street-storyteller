import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * メインキャラクター（桃太郎への参照）
 */
export const mainCharacter: Character = {
  "id": "main_character",
  "name": "桃太郎",
  "role": "protagonist",
  "traits": ["勇敢", "正義感", "優しい", "強い"],
  "relationships": {},
  "appearingChapters": ["chapter_01", "chapter_02", "chapter_03", "chapter_04"],
  "summary": "桃から生まれた少年。正義感が強く、鬼退治に向かう"
};
