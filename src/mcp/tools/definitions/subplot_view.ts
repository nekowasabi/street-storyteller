/**
 * subplot_viewツール定義
 * サブプロット情報を表示するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { executeCliCommand } from "@storyteller/mcp/tools/cli_adapter.ts";
import { ViewSubplotCommand } from "@storyteller/cli/modules/view/subplot.ts";

export const subplotViewTool: McpToolDefinition = {
  name: "subplot_view",
  description:
    "サブプロット情報を表示します。一覧表示、個別表示、タイプ/ステータスフィルタリングが可能です。",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list", "detail"],
        description: "表示アクション: list（一覧表示）, detail（個別表示）",
      },
      subplotId: {
        type: "string",
        description: "表示するサブプロットID（detailアクション時に使用）",
      },
      type: {
        type: "string",
        enum: ["main", "subplot", "parallel", "background"],
        description: "タイプフィルタ: main, subplot, parallel, background",
      },
      status: {
        type: "string",
        enum: ["planned", "active", "resolved", "abandoned"],
        description:
          "ステータスフィルタ: planned（計画中）, active（進行中）, resolved（解決済み）, abandoned（放棄）",
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

    const action = args.action as string | undefined;

    // actionが"detail"でsubplotIdがある場合は個別表示
    if (action === "detail") {
      if (
        typeof args.subplotId === "string" && args.subplotId.trim() !== ""
      ) {
        commandArgs.id = args.subplotId;
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: 'subplotId' is required when action is 'detail'.",
            },
          ],
          isError: true,
        };
      }
    } else {
      // デフォルトはlist
      commandArgs.list = true;
    }

    if (typeof args.type === "string") {
      const validTypes = ["main", "subplot", "parallel", "background"];
      if (!validTypes.includes(args.type)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Invalid type '${args.type}'. Must be one of: ${
                validTypes.join(", ")
              }.`,
            },
          ],
          isError: true,
        };
      }
      commandArgs.type = args.type;
    }

    if (typeof args.status === "string") {
      const validStatuses = ["planned", "active", "resolved", "abandoned"];
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

    const handler = new ViewSubplotCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
