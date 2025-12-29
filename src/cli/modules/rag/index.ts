/**
 * rag コマンドモジュール
 * Process 11: rag export コマンド
 */
import type { CommandDescriptor } from "../../types.ts";
import { ragExportCommandDescriptor } from "./export.ts";

// サブコマンドの再エクスポート
export {
  executeRagExport,
  parseRagExportOptions,
  RAG_EXPORT_OPTIONS,
  ragExportCommandDescriptor,
} from "./export.ts";

/**
 * rag コマンドディスクリプタ
 * メインコマンド + サブコマンド構造
 */
export const ragCommandDescriptor: CommandDescriptor = {
  name: "rag",
  summary: "RAGドキュメント管理",
  usage: "storyteller rag <subcommand> [options]",
  children: [
    {
      name: "export",
      ...ragExportCommandDescriptor,
    },
    // Process 50で追加予定
    // {
    //   name: "update",
    //   ...ragUpdateCommandDescriptor,
    // },
    // {
    //   name: "install-hooks",
    //   ...ragInstallHooksCommandDescriptor,
    // },
  ],
  handler: async (_args: Record<string, unknown>) => {
    // サブコマンドなしで呼ばれた場合はヘルプを表示
    console.log(`
storyteller rag - RAGドキュメント管理

サブコマンド:
  export      プロジェクト要素をRAGドキュメントにエクスポート

オプション:
  -h, --help  ヘルプを表示

使用例:
  storyteller rag export
  storyteller rag export --incremental
`);
    return 0;
  },
};
