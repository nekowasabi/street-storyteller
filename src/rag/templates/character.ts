/**
 * キャラクタードキュメントテンプレート
 * Process 2: キャラクタードキュメントテンプレート
 */
import type { Character } from "@storyteller/types/v2/character.ts";
import type { RagDocument } from "../types.ts";

/**
 * キャラクターからRAGドキュメントを生成
 */
export function generateCharacterDocument(character: Character): RagDocument {
  const tags = buildCharacterTags(character);
  const content = buildCharacterContent(character);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `character_${character.id}`,
    title: `Character: ${character.name} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/characters/${character.id}.ts`,
  };
}

/**
 * キャラクタータグを構築
 */
function buildCharacterTags(character: Character): string[] {
  const tags: string[] = ["character", character.role];

  // 登場チャプター
  tags.push(...character.appearingChapters);

  // 特徴（最大5つ）
  tags.push(...character.traits.slice(0, 5));

  // displayNames（タグに追加）
  if (character.displayNames) {
    tags.push(...character.displayNames.slice(0, 3));
  }

  return tags;
}

/**
 * キャラクターコンテンツを構築
 */
function buildCharacterContent(character: Character): string {
  const sections: string[] = [];

  // 基本情報
  sections.push(`## 基本情報
- ID: ${character.id}
- 名前: ${character.name}
- 役割: ${character.role}
- 登場チャプター: ${character.appearingChapters.join(", ") || "（未設定）"}`);

  // 性格・特徴
  if (character.traits.length > 0) {
    sections.push(`## 性格・特徴
${character.traits.map((t) => `- ${t}`).join("\n")}`);
  }

  // 別名・表記（displayNames + aliases）
  const hasDisplayNames = character.displayNames &&
    character.displayNames.length > 0;
  const hasAliases = character.aliases && character.aliases.length > 0;
  if (hasDisplayNames || hasAliases) {
    const items: string[] = [];
    if (hasDisplayNames) {
      items.push(
        ...character.displayNames!.map((n) => `- 表記: ${n}`),
      );
    }
    if (hasAliases) {
      items.push(
        ...character.aliases!.map((a) => `- 別名: ${a}`),
      );
    }
    sections.push(`## 別名・表記
${items.join("\n")}`);
  }

  // 関係性
  const relationships = Object.entries(character.relationships);
  if (relationships.length > 0) {
    sections.push(`## 関係性
${relationships.map(([name, type]) => `- ${name}: ${type}`).join("\n")}`);
  }

  // 概要
  sections.push(`## 概要
${character.summary}`);

  // 成長フェーズ（存在する場合）
  if (character.phases && character.phases.length > 0) {
    const phaseLines = character.phases.map((p, i) => {
      const chapterInfo = p.startChapter
        ? ` (${p.startChapter}${p.endChapter ? `-${p.endChapter}` : ""})`
        : "";
      return `- Phase ${i + 1}${chapterInfo}: ${p.name} - ${p.summary}`;
    });
    sections.push(`## 成長フェーズ
${phaseLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
