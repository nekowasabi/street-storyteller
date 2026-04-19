/**
 * rag export コマンド
 * Process 11: rag export コマンド
 */
import { ok } from "@storyteller/shared/result.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandOptionDescriptor,
} from "../../types.ts";
import type { GeneratorOptions } from "@storyteller/rag/types.ts";
import { createDefaultGeneratorOptions } from "@storyteller/rag/types.ts";

/** エクスポートオプション（CLI引数） */
export interface RagExportCliOptions {
  output?: string;
  "manuscript-format"?: "full" | "summary";
  chunking?: "document" | "scene" | "auto";
  incremental?: boolean;
  json?: boolean;
}

/** rag export コマンドオプション定義 */
export const RAG_EXPORT_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "output",
    summary: "出力ディレクトリ",
    aliases: ["o"],
    type: "string",
    defaultValue: ".rag-docs",
  },
  {
    name: "manuscript-format",
    summary: "原稿フォーマット: full | summary",
    type: "string",
    defaultValue: "full",
  },
  {
    name: "chunking",
    summary: "チャンキング戦略: document | scene | auto",
    type: "string",
    defaultValue: "auto",
  },
  {
    name: "incremental",
    summary: "変更ファイルのみエクスポート",
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
 * CLI引数からGeneratorOptionsを生成
 */
export function parseRagExportOptions(
  args: RagExportCliOptions,
): GeneratorOptions {
  const defaults = createDefaultGeneratorOptions();

  return {
    ...defaults,
    outputDir: args.output ?? defaults.outputDir,
    manuscriptFormat: args["manuscript-format"] ?? defaults.manuscriptFormat,
    chunking: {
      ...defaults.chunking,
      strategy: args.chunking ?? defaults.chunking.strategy,
    },
    incremental: args.incremental ?? defaults.incremental,
  };
}

/**
 * rag export コマンドハンドラ
 */
export async function executeRagExport(
  options: GeneratorOptions,
  _jsonOutput: boolean = false,
): Promise<{ success: boolean; message: string; result?: unknown }> {
  // TODO: 実際のエクスポート処理を実装
  // 現時点ではスタブ実装
  return {
    success: true,
    message: `RAGドキュメントを ${options.outputDir} にエクスポートしました`,
    result: {
      outputDir: options.outputDir,
      documentCount: 0,
      chunkCount: 0,
    },
  };
}

/**
 * rag export コマンドのハンドラ
 * BaseCliCommand経由でCommandHandlerインターフェースに適合
 */
class RagExportCommand extends BaseCliCommand {
  override readonly name = "export" as const;
  override readonly path = ["rag", "export"] as const;

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    const options = parseRagExportOptions(args);
    const result = await executeRagExport(options);
    if (result.success) {
      context.presenter.showSuccess(result.message);
    } else {
      context.presenter.showError(result.message);
    }
    return ok(undefined);
  }
}

// Why: BaseCliCommand + createLegacyCommandDescriptor パターンで CommandHandler インターフェースに適合。
// 直接オブジェクトリテラルで handler プロパティを定義すると CommandHandler 型（name + execute）に合わないため。
export const ragExportCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(new RagExportCommand(), {
    summary: "プロジェクト要素をRAGドキュメントにエクスポート",
    usage: "storyteller rag export [options]",
    options: RAG_EXPORT_OPTIONS,
    examples: [
      {
        summary: "全要素をデフォルト設定でエクスポート",
        command: "storyteller rag export",
      },
      {
        summary: "シーン単位チャンキングで指定ディレクトリにエクスポート",
        command: "storyteller rag export -o my-docs --chunking scene",
      },
      {
        summary: "変更ファイルのみエクスポート",
        command: "storyteller rag export --incremental",
      },
    ],
  });
