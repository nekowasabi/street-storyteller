/**
 * foreshadowing_viewツール定義
 * 伏線を表示するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ViewForeshadowingCommand } from "../../../cli/modules/view/foreshadowing.ts";

export const foreshadowingViewTool: McpToolDefinition = {
  name: "foreshadowing_view",
  description:
    "伏線情報を表示します。一覧表示、個別表示、ステータスフィルタリングが可能です。",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "表示する伏線ID（個別表示）",
      },
      list: {
        type: "boolean",
        description: "一覧表示モード",
      },
      status: {
        type: "string",
        enum: ["planted", "partially_resolved", "resolved", "abandoned"],
        description:
          "ステータスフィルタ: planted（設置済み）, partially_resolved（一部回収）, resolved（回収済み）, abandoned（放棄）",
      },
      json: {
        type: "boolean",
        description: "JSON形式で出力",
      },
    },
    required: [],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {};

    if (typeof args.id === "string" && args.id.trim() !== "") {
      commandArgs.id = args.id;
    }

    if (args.list === true) {
      commandArgs.list = true;
    }

    if (typeof args.status === "string") {
      const validStatuses = [
        "planted",
        "partially_resolved",
        "resolved",
        "abandoned",
      ];
      if (!validStatuses.includes(args.status)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Invalid status '${args.status}'. Must be one of: ${
                validStatuses.join(", ")
              }.`,
            },
          ],
          isError: true,
        };
      }
      commandArgs.status = args.status;
    }

    if (args.json === true) {
      commandArgs.json = true;
    }

    // idもlistもない場合はlistをデフォルトに
    if (!commandArgs.id && !commandArgs.list) {
      commandArgs.list = true;
    }

    const handler = new ViewForeshadowingCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
