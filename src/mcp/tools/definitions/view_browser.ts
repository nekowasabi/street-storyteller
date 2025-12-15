/**
 * view_browserツール定義
 * プロジェクトの物語要素をHTML形式で可視化するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ViewCommand } from "../../../cli/modules/view.ts";

export const viewBrowserTool: McpToolDefinition = {
  name: "view_browser",
  description:
    "プロジェクト構造をHTML形式で可視化します（HTML生成/ローカルサーバー起動）。",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "プロジェクトルートパス（未指定の場合はカレントディレクトリ）",
      },
      output: {
        type: "string",
        description:
          "HTML出力ファイルパス（未指定の場合は <project>/index.html）",
      },
      serve: {
        type: "boolean",
        description: "ローカルサーバーで表示する（trueで --serve 相当）",
      },
      port: {
        type: "number",
        description: "サーバーポート（--serve時のみ。デフォルト: 8080）",
      },
      watch: {
        type: "boolean",
        description: "ファイル監視によるライブリロード（--serve時のみ）",
      },
      timeout: {
        type: "number",
        description:
          "サーバー自動停止のタイムアウト（秒）。0で無制限（非推奨）",
      },
      dryRun: {
        type: "boolean",
        description:
          "プレビューのみ（サーバー起動やファイル書き込みを行わない）",
      },
    },
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const commandArgs: Record<string, unknown> = {};
    const projectRoot = context?.projectRoot;

    // コンテキストからのprojectRootを優先、なければargsから
    if (projectRoot) {
      commandArgs.path = projectRoot;
    } else if (typeof args.path === "string" && args.path.trim().length > 0) {
      commandArgs.path = args.path;
    }

    const serve = args.serve === true;
    if (serve) {
      commandArgs.serve = true;

      if (typeof args.port === "number") {
        commandArgs.port = args.port;
      }
      if (args.watch === true) {
        commandArgs.watch = true;
      }
      if (typeof args.timeout === "number") {
        // CLIはミリ秒ではなく秒（実装上はそのまま扱っている）
        commandArgs.timeout = args.timeout;
      } else if (args.dryRun !== true) {
        // MCPツールとして無限待機は扱いにくいので、明示指定がない場合は安全側のデフォルトを入れる
        commandArgs.timeout = 5;
      }

      if (args.dryRun === true) {
        commandArgs["dry-run"] = true;
      }
    } else {
      // HTML生成モード
      if (typeof args.output === "string" && args.output.trim().length > 0) {
        commandArgs.output = args.output;
      }
    }

    const handler = new ViewCommand();
    return await executeCliCommand(handler, commandArgs, projectRoot);
  },
};
