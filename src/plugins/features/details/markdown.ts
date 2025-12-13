/**
 * Markdownコンテンツ生成ユーティリティ
 *
 * インライン詳細をMarkdownファイルに分離する際のフロントマター付きコンテンツ生成
 */

import type { DetailField } from "./templates.ts";

/**
 * Markdownコンテンツ生成時のメタデータ
 */
export type MarkdownMetadata = {
  characterId: string;
  characterName: string;
};

/**
 * Markdownコンテンツを生成（フロントマター付き）
 *
 * @param field フィールド名
 * @param content インライン内容
 * @param metadata メタデータ
 * @returns フロントマター付きMarkdown文字列
 */
export function generateMarkdownContent(
  field: DetailField,
  content: string,
  metadata: MarkdownMetadata,
): string {
  const frontMatter = generateFrontMatter(field, metadata);
  const body = content.trim();

  return `${frontMatter}\n${body}\n`;
}

/**
 * フロントマターを生成
 *
 * @param field フィールド名
 * @param metadata メタデータ
 * @returns フロントマター文字列（---で囲まれた部分）
 */
function generateFrontMatter(
  field: DetailField,
  metadata: MarkdownMetadata,
): string {
  const fieldLabel = getFieldLabel(field);
  const date = new Date().toISOString().split("T")[0];

  return `---
type: character-detail
field: ${field}
characterId: ${metadata.characterId}
characterName: ${metadata.characterName}
title: ${fieldLabel}
created: ${date}
---

# ${metadata.characterName} - ${fieldLabel}
`;
}

/**
 * フィールドの日本語ラベルを取得
 *
 * @param field フィールド名
 * @returns 日本語ラベル
 */
function getFieldLabel(field: DetailField): string {
  const labels: Record<DetailField, string> = {
    appearance: "外見",
    personality: "性格",
    backstory: "背景ストーリー",
    relationships_detail: "人間関係の詳細",
    goals: "目標・動機",
    development: "キャラクター発展",
  };

  return labels[field];
}
