/**
 * 設定ドキュメントテンプレート
 * Process 3: 設定ドキュメントテンプレート
 */
import type { Setting } from "@storyteller/types/v2/setting.ts";
import type { RagDocument } from "../types.ts";

/**
 * 設定からRAGドキュメントを生成
 */
export function generateSettingDocument(setting: Setting): RagDocument {
  const tags = buildSettingTags(setting);
  const content = buildSettingContent(setting);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `setting_${setting.id}`,
    title: `Setting: ${setting.name} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/settings/${setting.id}.ts`,
  };
}

/**
 * 設定タグを構築
 */
function buildSettingTags(setting: Setting): string[] {
  const tags: string[] = ["setting", setting.type];

  // 登場チャプター
  tags.push(...setting.appearingChapters);

  // displayNames（最大3つ）
  if (setting.displayNames) {
    tags.push(...setting.displayNames.slice(0, 3));
  }

  return tags;
}

/**
 * 設定コンテンツを構築
 */
function buildSettingContent(setting: Setting): string {
  const sections: string[] = [];

  // 基本情報
  sections.push(`## 基本情報
- ID: ${setting.id}
- 名前: ${setting.name}
- タイプ: ${setting.type}
- 別名: ${setting.displayNames?.join(", ") || "（なし）"}`);

  // 概要
  sections.push(`## 概要
${setting.summary}`);

  // 関連設定
  if (setting.relatedSettings && setting.relatedSettings.length > 0) {
    sections.push(`## 関連設定
${setting.relatedSettings.map((s) => `- ${s}`).join("\n")}`);
  }

  return sections.join("\n\n");
}
