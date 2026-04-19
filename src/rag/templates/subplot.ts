import type { Subplot } from "@storyteller/types/v2/subplot.ts";
import type { RagDocument } from "../types.ts";

export function generateSubplotDocument(subplot: Subplot): RagDocument {
  const tags = buildSubplotTags(subplot);
  const content = buildSubplotContent(subplot);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `subplot_${subplot.id}`,
    title: `Subplot: ${subplot.name} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/subplots/${subplot.id}.ts`,
  };
}

function buildSubplotTags(subplot: Subplot): string[] {
  const tags: string[] = [
    "subplot",
    subplot.type,
    subplot.status,
  ];

  if (subplot.importance) {
    tags.push(subplot.importance);
  }

  if (subplot.focusCharacters) {
    tags.push(...Object.keys(subplot.focusCharacters));
  }

  if (subplot.displayNames) {
    tags.push(...subplot.displayNames.slice(0, 3));
  }

  return tags;
}

function buildSubplotContent(subplot: Subplot): string {
  const sections: string[] = [];

  sections.push(`## 基本情報
- ID: ${subplot.id}
- 名前: ${subplot.name}
- タイプ: ${subplot.type}
- ステータス: ${subplot.status}
- 重要度: ${subplot.importance ?? "（未設定）"}`);

  sections.push(`## 概要
${subplot.summary}`);

  if (subplot.focusCharacters && Object.keys(subplot.focusCharacters).length > 0) {
    const lines = Object.entries(subplot.focusCharacters).map(
      ([charId, weight]) => `- **${charId}:** ${weight}`,
    );
    sections.push(`## フォーカスキャラクター
${lines.join("\n")}`);
  }

  if (subplot.beats.length > 0) {
    const sorted = [...subplot.beats].sort((a, b) =>
      (a.chapter ?? "").localeCompare(b.chapter ?? "")
    );
    const beatLines = sorted.map((beat) => {
      const parts = [`### ${beat.title}`];
      if (beat.chapter) parts.push(`- チャプター: ${beat.chapter}`);
      parts.push(`- 構造位置: ${beat.structurePosition}`);
      if (beat.summary) parts.push(beat.summary);
      if (beat.characters?.length) parts.push(`- キャラクター: ${beat.characters.join(", ")}`);
      return parts.join("\n");
    });
    sections.push(`## ビート一覧
${beatLines.join("\n\n")}`);
  }

  if (subplot.intersections?.length) {
    const ixLines = subplot.intersections.map((ix) =>
      `- ${ix.sourceSubplotId}/${ix.sourceBeatId} → ${ix.targetSubplotId}/${ix.targetBeatId} (${ix.influenceDirection}): ${ix.summary}`
    );
    sections.push(`## インターセクション
${ixLines.join("\n")}`);
  }

  if (subplot.relations) {
    const relItems: string[] = [];
    if (subplot.relations.characters.length > 0) {
      relItems.push(`- キャラクター: ${subplot.relations.characters.join(", ")}`);
    }
    if (subplot.relations.settings.length > 0) {
      relItems.push(`- 設定: ${subplot.relations.settings.join(", ")}`);
    }
    if (subplot.relations.foreshadowings?.length) {
      relItems.push(`- 伏線: ${subplot.relations.foreshadowings.join(", ")}`);
    }
    if (relItems.length > 0) {
      sections.push(`## 関連エンティティ
${relItems.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}
