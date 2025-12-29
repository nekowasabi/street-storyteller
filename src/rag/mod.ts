/**
 * RAGモジュール
 * storytellerの全要素をRAGドキュメントに変換
 */

// 型定義
export type {
  ChunkingOptions,
  ExportError,
  ExportResult,
  GeneratorOptions,
  RagDocument,
} from "./types.ts";

// ユーティリティ関数
export {
  createDefaultChunkingOptions,
  createDefaultGeneratorOptions,
} from "./types.ts";

// チャンキング
export type { ChunkingStrategy, DocumentMetadata } from "./chunker.ts";
export { chunkContent, selectChunkingStrategy } from "./chunker.ts";

// テンプレート
export * from "./templates/mod.ts";

// インクリメンタルエクスポート
export type {
  DocumentHash,
  FileState,
  IncrementalDiff,
  RagState,
} from "./incremental.ts";
export {
  computeContentHash,
  createEmptyState,
  detectChanges,
  removeFromState,
  updateState,
} from "./incremental.ts";
