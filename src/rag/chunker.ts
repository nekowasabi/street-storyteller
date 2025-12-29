/**
 * チャンキングエンジン
 * Process 10: チャンキングエンジン基盤
 */
import type { ChunkingOptions, RagDocument } from "./types.ts";

/** チャンキング戦略 */
export type ChunkingStrategy = "document" | "scene" | "semantic";

/** ドキュメントメタデータ */
export interface DocumentMetadata {
  id: string;
  title: string;
  date?: string;
  tags?: string[];
  sourcePath?: string;
}

/** サイズ閾値 */
const SMALL_THRESHOLD = 3000; // 3000文字以下はドキュメント単位
const MEDIUM_THRESHOLD = 15000; // 15000文字以下はシーン単位

/**
 * コンテンツサイズに基づいてチャンキング戦略を選択
 */
export function selectChunkingStrategy(content: string): ChunkingStrategy {
  const charCount = content.length;

  // 小規模: ドキュメント単位（分割なし）
  if (charCount <= SMALL_THRESHOLD) {
    return "document";
  }

  // 中規模: シーン単位（## 見出しで分割）
  if (charCount <= MEDIUM_THRESHOLD) {
    return "scene";
  }

  // 大規模: セマンティック分割
  return "semantic";
}

/**
 * コンテンツをチャンクに分割
 */
export function chunkContent(
  content: string,
  metadata: DocumentMetadata,
  options: ChunkingOptions,
): RagDocument[] {
  const strategy = options.strategy === "auto"
    ? selectChunkingStrategy(content)
    : options.strategy;

  switch (strategy) {
    case "document":
      return [createSingleDocument(content, metadata)];
    case "scene":
      return chunkByScene(content, metadata, options);
    case "semantic":
      // Process 30以降で本格実装
      // 現時点ではシーン分割にフォールバック
      return chunkByScene(content, metadata, options);
    default:
      return [createSingleDocument(content, metadata)];
  }
}

/**
 * 単一ドキュメントを作成
 */
function createSingleDocument(
  content: string,
  metadata: DocumentMetadata,
): RagDocument {
  return {
    id: metadata.id,
    title: metadata.title,
    date: metadata.date || new Date().toISOString().split("T")[0],
    tags: metadata.tags || [],
    content,
    sourcePath: metadata.sourcePath || "",
  };
}

/**
 * シーン単位（## 見出し）でチャンク分割
 */
function chunkByScene(
  content: string,
  metadata: DocumentMetadata,
  options: ChunkingOptions,
): RagDocument[] {
  // ## 見出しで分割（見出し自体は次のシーンに含める）
  const scenes = content.split(/(?=^## )/m);
  const documents: RagDocument[] = [];

  let sceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // 最小サイズ未満はスキップ
    if (scene.trim().length < options.minChunkChars) {
      continue;
    }

    sceneIndex++;

    // オーバーラップ追加（前のシーンの末尾を含める）
    const overlap = i > 0
      ? getOverlap(scenes[i - 1], options.overlapChars)
      : "";

    const chunkContent = overlap + scene;
    const sceneNum = String(sceneIndex).padStart(2, "0");

    documents.push({
      id: `${metadata.id}_scene${sceneNum}`,
      title: `${metadata.title} - Scene ${sceneIndex}`,
      date: metadata.date || new Date().toISOString().split("T")[0],
      tags: [...(metadata.tags || []), `scene${sceneIndex}`],
      content: chunkContent,
      sourcePath: metadata.sourcePath || "",
    });
  }

  // シーンがない場合はドキュメント単位で返す
  if (documents.length === 0) {
    return [createSingleDocument(content, metadata)];
  }

  return documents;
}

/**
 * 前のコンテンツからオーバーラップ部分を取得
 */
function getOverlap(previousContent: string, overlapChars: number): string {
  if (previousContent.length <= overlapChars) {
    return previousContent;
  }
  return "..." + previousContent.slice(-overlapChars);
}
