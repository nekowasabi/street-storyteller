/**
 * 詳細フィールドのテンプレート
 */

import type { CharacterDevelopment } from "../../../type/v2/character.ts";

/**
 * 利用可能な詳細フィールド
 */
export type DetailField = "appearance" | "personality" | "backstory" | "relationships_detail" | "goals" | "development";

/**
 * 詳細フィールドのテンプレート定義
 */
export const DETAIL_TEMPLATES: Record<DetailField, string | (() => CharacterDevelopment)> = {
  appearance: "（外見の詳細を記述してください。例: 髪の色、目の色、身長、服装など）",
  personality: "（性格の詳細を記述してください。例: 思考パターン、感情表現、癖など）",
  backstory: "（背景ストーリーを記述してください。例: 生い立ち、重要な過去の出来事など）",
  relationships_detail: "（人間関係の詳細を記述してください。例: 各キャラクターとの関係性の深掘り）",
  goals: "（目標・動機の詳細を記述してください。例: 長期的な野望、短期的な目標など）",
  development: () => ({
    initial: "（初期状態を記述）",
    goal: "（目標を記述）",
    obstacle: "（障害を記述）",
    resolution: "（解決方法を記述・オプショナル）",
  }),
};

/**
 * 詳細フィールドのテンプレートを取得
 * @param field フィールド名
 * @returns テンプレート（文字列またはオブジェクト）
 */
export function getTemplate(field: DetailField): string | CharacterDevelopment {
  const template = DETAIL_TEMPLATES[field];
  if (typeof template === "function") {
    return template();
  }
  return template;
}

/**
 * 利用可能な詳細フィールド一覧を取得
 * @returns フィールド名の配列
 */
export function getAvailableFields(): DetailField[] {
  return Object.keys(DETAIL_TEMPLATES) as DetailField[];
}

/**
 * フィールド名が有効かチェック
 * @param field フィールド名
 * @returns 有効な場合true
 */
export function isValidField(field: string): field is DetailField {
  return getAvailableFields().includes(field as DetailField);
}
