/**
 * 伏線ドキュメントテンプレート
 * Process 20: 全要素タイプ対応
 */
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
import type { RagDocument } from "../types.ts";

/**
 * 伏線からRAGドキュメントを生成
 */
export function generateForeshadowingDocument(
  foreshadowing: Foreshadowing,
): RagDocument {
  const tags = buildForeshadowingTags(foreshadowing);
  const content = buildForeshadowingContent(foreshadowing);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `foreshadowing_${foreshadowing.id}`,
    title: `Foreshadowing: ${foreshadowing.name} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/foreshadowings/${foreshadowing.id}.ts`,
  };
}

/**
 * 伏線タグを構築
 */
function buildForeshadowingTags(foreshadowing: Foreshadowing): string[] {
  const tags: string[] = [
    "foreshadowing",
    foreshadowing.status,
    foreshadowing.type,
  ];

  // 重要度
  if (foreshadowing.importance) {
    tags.push(foreshadowing.importance);
  }

  // 設置チャプター
  tags.push(foreshadowing.planting.chapter);

  // 回収チャプター
  if (foreshadowing.resolutions) {
    for (const res of foreshadowing.resolutions) {
      tags.push(res.chapter);
    }
  }

  // displayNames
  if (foreshadowing.displayNames) {
    tags.push(...foreshadowing.displayNames.slice(0, 3));
  }

  return tags;
}

/**
 * 伏線コンテンツを構築
 */
function buildForeshadowingContent(foreshadowing: Foreshadowing): string {
  const sections: string[] = [];

  // 基本情報
  sections.push(`## 基本情報
- ID: ${foreshadowing.id}
- 名前: ${foreshadowing.name}
- タイプ: ${foreshadowing.type}
- ステータス: ${foreshadowing.status}
- 重要度: ${foreshadowing.importance || "（未設定）"}`);

  // 概要
  sections.push(`## 概要
${foreshadowing.summary}`);

  // 設置情報
  sections.push(`## 設置情報
- チャプター: ${foreshadowing.planting.chapter}
- 説明: ${foreshadowing.planting.description}`);

  // 回収情報
  if (foreshadowing.resolutions && foreshadowing.resolutions.length > 0) {
    const resolutionLines = foreshadowing.resolutions.map((res) => {
      const completeness = Math.round(res.completeness * 100);
      return `- ${res.chapter}: ${res.description} (${completeness}%)`;
    });
    sections.push(`## 回収情報
${resolutionLines.join("\n")}`);
  }

  // 計画されている回収チャプター
  if (foreshadowing.plannedResolutionChapter) {
    sections.push(
      `## 計画回収チャプター
- ${foreshadowing.plannedResolutionChapter}`,
    );
  }

  // 関連エンティティ
  if (foreshadowing.relations) {
    const relItems: string[] = [];
    if (
      foreshadowing.relations.characters &&
      foreshadowing.relations.characters.length > 0
    ) {
      relItems.push(
        `- キャラクター: ${foreshadowing.relations.characters.join(", ")}`,
      );
    }
    if (
      foreshadowing.relations.settings &&
      foreshadowing.relations.settings.length > 0
    ) {
      relItems.push(
        `- 設定: ${foreshadowing.relations.settings.join(", ")}`,
      );
    }
    if (
      foreshadowing.relations.relatedForeshadowings &&
      foreshadowing.relations.relatedForeshadowings.length > 0
    ) {
      relItems.push(
        `- 関連伏線: ${
          foreshadowing.relations.relatedForeshadowings.join(", ")
        }`,
      );
    }
    if (relItems.length > 0) {
      sections.push(`## 関連エンティティ
${relItems.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}
