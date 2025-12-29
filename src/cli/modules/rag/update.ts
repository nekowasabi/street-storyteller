/**
 * rag update コマンド
 * Process 50: 自動更新システム
 *
 * RAGエクスポート + digrag buildを一括実行
 */
import type {
  CommandDescriptor,
  CommandOptionDescriptor,
} from "../../types.ts";

/**
 * CLI引数の型
 */
export interface RagUpdateCliOptions {
  output?: string;
  "index-dir"?: string;
  "no-embeddings"?: boolean;
  force?: boolean;
  json?: boolean;
}

/**
 * パース後のオプション
 */
export interface RagUpdateOptions {
  /** RAGドキュメント出力ディレクトリ */
  outputDir: string;
  /** digragインデックスディレクトリ */
  indexDir: string;
  /** embedding生成をスキップ（BM25のみ） */
  noEmbeddings: boolean;
  /** 強制フル再構築 */
  force: boolean;
  /** JSON形式で出力 */
  json: boolean;
}

/**
 * rag update コマンドオプション定義
 */
export const RAG_UPDATE_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "output",
    summary: "RAGドキュメント出力ディレクトリ",
    aliases: ["o"],
    type: "string",
    defaultValue: ".rag-docs",
  },
  {
    name: "index-dir",
    summary: "digragインデックスディレクトリ",
    aliases: ["i"],
    type: "string",
    defaultValue: ".rag",
  },
  {
    name: "no-embeddings",
    summary: "embedding生成をスキップ（BM25のみ）",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "force",
    summary: "強制フル再構築",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "json",
    summary: "JSON形式で出力",
    type: "boolean",
    defaultValue: false,
  },
];

/**
 * CLI引数をパース
 */
export function parseRagUpdateOptions(
  args: RagUpdateCliOptions,
): RagUpdateOptions {
  return {
    outputDir: args.output ?? ".rag-docs",
    indexDir: args["index-dir"] ?? ".rag",
    noEmbeddings: args["no-embeddings"] ?? false,
    force: args.force ?? false,
    json: args.json ?? false,
  };
}

/**
 * rag update コマンド実行
 */
export async function executeRagUpdate(
  options: RagUpdateOptions,
): Promise<{ success: boolean; message: string }> {
  // TODO: 実際の実装
  // 1. storyteller rag export --incremental (or --force)
  // 2. digrag build

  const mode = options.force ? "full rebuild" : "incremental update";

  return {
    success: true,
    message: `RAG update completed (${mode})`,
  };
}

/**
 * rag update コマンドディスクリプタ
 */
export const ragUpdateCommandDescriptor: CommandDescriptor = {
  name: "update",
  summary: "RAGドキュメントとインデックスを更新",
  description:
    "storyteller rag export + digrag build を一括実行。変更されたファイルのみを処理します。",
  options: RAG_UPDATE_OPTIONS,
  examples: [
    { command: "storyteller rag update", summary: "インクリメンタル更新" },
    { command: "storyteller rag update --force", summary: "フル再構築" },
    {
      command: "storyteller rag update --no-embeddings",
      summary: "BM25のみ（高速）",
    },
    { command: "storyteller rag update --json", summary: "JSON形式で結果出力" },
  ],
  handler: {
    name: "rag:update",
    execute: async () => ({ ok: true, value: {} }),
  },
};
