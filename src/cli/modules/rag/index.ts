/**
 * rag コマンドモジュール
 * Process 11: rag export コマンド
 */
import { ok } from "@storyteller/shared/result.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "../../types.ts";
import { ragExportCommandDescriptor } from "./export.ts";

// サブコマンドの再エクスポート
export {
  executeRagExport,
  parseRagExportOptions,
  RAG_EXPORT_OPTIONS,
  ragExportCommandDescriptor,
} from "./export.ts";

/**
 * RagCommand クラス
 * ragコマンドグループのルートハンドラー
 */
class RagCommand extends BaseCliCommand {
  override readonly name = "rag" as const;

  protected handle(context: CommandContext) {
    // サブコマンドなしで呼ばれた場合はヘルプを表示
    context.presenter.showInfo(`
storyteller rag - RAGドキュメント管理

サブコマンド:
  export      プロジェクト要素をRAGドキュメントにエクスポート

オプション:
  -h, --help  ヘルプを表示

使用例:
  storyteller rag export
  storyteller rag export --incremental
`);
    return Promise.resolve(ok(undefined));
  }
}

// Why: BaseCliCommand + createLegacyCommandDescriptor パターンで CommandHandler インターフェースに適合。
// 直接オブジェクトリテラルで handler プロパティに async 関数を渡すと CommandHandler 型（name + execute）に合わないため。
export const ragCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(new RagCommand(), {
    summary: "RAGドキュメント管理",
    usage: "storyteller rag <subcommand> [options]",
    children: [
      ragExportCommandDescriptor,
    ],
  });
