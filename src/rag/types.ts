/**
 * RAG型定義
 * Process 1: RAG基盤モジュール構造
 */

/**
 * RAGドキュメント
 * digrag互換のドキュメント形式
 */
export interface RagDocument {
  /** ドキュメントID（ファイル名ベース） */
  id: string;
  /** digrag互換タイトル（`* Title YYYY-MM-DD` 形式用） */
  title: string;
  /** 日付（ISO8601: YYYY-MM-DD） */
  date: string;
  /** タグリスト（フィルタリング用） */
  tags: string[];
  /** 本文（Markdown形式） */
  content: string;
  /** 元ファイルパス */
  sourcePath: string;
}

/**
 * ドキュメント生成オプション
 */
export interface GeneratorOptions {
  /** 出力ディレクトリ（デフォルト: .rag-docs） */
  outputDir: string;
  /** 原稿出力形式: full=全文, summary=要約 */
  manuscriptFormat: "full" | "summary";
  /** チャンキング設定 */
  chunking: ChunkingOptions;
  /** インクリメンタルモード（変更分のみエクスポート） */
  incremental: boolean;
}

/**
 * チャンキングオプション
 */
export interface ChunkingOptions {
  /** チャンキング戦略: document=分割なし, scene=##見出し単位, semantic=意味単位, auto=自動選択 */
  strategy: "document" | "scene" | "semantic" | "auto";
  /** 最大チャンクサイズ（文字数、デフォルト: 5000） */
  maxChunkChars: number;
  /** オーバーラップ（文字数、デフォルト: 500） */
  overlapChars: number;
  /** 最小チャンクサイズ（文字数、デフォルト: 200） */
  minChunkChars: number;
}

/**
 * エクスポート結果
 */
export interface ExportResult {
  /** 生成されたドキュメント数 */
  documentCount: number;
  /** 生成されたチャンク数 */
  chunkCount: number;
  /** 総サイズ（バイト） */
  totalSize: number;
  /** 出力ディレクトリ */
  outputDir: string;
  /** 処理時間（ミリ秒） */
  duration: number;
  /** 生成されたファイル一覧 */
  files: string[];
  /** エラー一覧 */
  errors: ExportError[];
}

/**
 * エクスポートエラー
 */
export interface ExportError {
  /** エラーが発生したファイル */
  file: string;
  /** エラーメッセージ */
  message: string;
  /** エラータイプ */
  type: "parse" | "write" | "unknown";
}

/**
 * デフォルトのGeneratorOptionsを生成
 */
export function createDefaultGeneratorOptions(
  overrides?: Partial<GeneratorOptions>,
): GeneratorOptions {
  return {
    outputDir: ".rag-docs",
    manuscriptFormat: "full",
    chunking: {
      strategy: "auto",
      maxChunkChars: 5000,
      overlapChars: 500,
      minChunkChars: 200,
    },
    incremental: false,
    ...overrides,
  };
}

/**
 * デフォルトのChunkingOptionsを生成
 */
export function createDefaultChunkingOptions(
  overrides?: Partial<ChunkingOptions>,
): ChunkingOptions {
  return {
    strategy: "auto",
    maxChunkChars: 5000,
    overlapChars: 500,
    minChunkChars: 200,
    ...overrides,
  };
}
