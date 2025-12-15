import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * テスト勇者
 * テスト用
 */
export const test_hero: Character = {
  "id": "test_hero",
  "name": "テスト勇者",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "テスト用",
  "details": {
    "appearance":
      "（外見の詳細を記述してください。例: 髪の色、目の色、身長、服装など）",
    "personality":
      "（性格の詳細を記述してください。例: 思考パターン、感情表現、癖など）",
    "backstory":
      "（背景ストーリーを記述してください。例: 生い立ち、重要な過去の出来事など）",
    "development": {
      "initial": "（初期状態を記述）",
      "goal": "（目標を記述）",
      "obstacle": "（障害を記述）",
      "resolution": "（解決方法を記述・オプショナル）",
    },
  },
};
