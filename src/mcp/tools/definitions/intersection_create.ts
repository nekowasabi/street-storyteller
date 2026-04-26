/**
 * intersection_createツール定義
 * プロット交差要素を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { executeCliCommand } from "@storyteller/mcp/tools/cli_adapter.ts";
import { ElementIntersectionCommand } from "@storyteller/cli/modules/element/intersection.ts";

export const intersectionCreateTool: McpToolDefinition = {
  name: "intersection_create",
  description:
    "プロット交差要素を作成します。異なるサブプロット間のビート交差（影響関係）を定義し、プロット間の相互作用を管理します。",
  inputSchema: {
    type: "object",
    properties: {
      sourceSubplotId: {
        type: "string",
        description: "影響元サブプロットID",
      },
      sourceBeatId: {
        type: "string",
        description: "影響元ビートID",
      },
      targetSubplotId: {
        type: "string",
        description: "影響先サブプロットID",
      },
      targetBeatId: {
        type: "string",
        description: "影響先ビートID",
      },
      summary: {
        type: "string",
        description: "交差の概要",
      },
      influenceDirection: {
        type: "string",
        enum: ["forward", "backward", "mutual"],
        description:
          "影響の方向: forward（順方向）, backward（逆方向）, mutual（相互）",
      },
      influenceLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "影響度: high（高）, medium（中）, low（低）",
      },
    },
    required: [
      "sourceSubplotId",
      "sourceBeatId",
      "targetSubplotId",
      "targetBeatId",
      "summary",
    ],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const sourceSubplotId = args.sourceSubplotId as string | undefined;
    const sourceBeatId = args.sourceBeatId as string | undefined;
    const targetSubplotId = args.targetSubplotId as string | undefined;
    const targetBeatId = args.targetBeatId as string | undefined;
    const summary = args.summary as string | undefined;

    // 必須パラメータの検証
    if (
      !sourceSubplotId ||
      typeof sourceSubplotId !== "string" ||
      sourceSubplotId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'sourceSubplotId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (
      !sourceBeatId ||
      typeof sourceBeatId !== "string" ||
      sourceBeatId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'sourceBeatId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (
      !targetSubplotId ||
      typeof targetSubplotId !== "string" ||
      targetSubplotId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'targetSubplotId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (
      !targetBeatId ||
      typeof targetBeatId !== "string" ||
      targetBeatId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'targetBeatId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!summary || typeof summary !== "string" || summary.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'summary' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    // influenceDirectionの検証
    if (typeof args.influenceDirection === "string") {
      const validDirections = ["forward", "backward", "mutual"];
      if (!validDirections.includes(args.influenceDirection)) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Invalid influenceDirection '${args.influenceDirection}'. Must be one of: ${
                  validDirections.join(", ")
                }.`,
            },
          ],
          isError: true,
        };
      }
    }

    // influenceLevelの検証
    if (typeof args.influenceLevel === "string") {
      const validLevels = ["high", "medium", "low"];
      if (!validLevels.includes(args.influenceLevel)) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Invalid influenceLevel '${args.influenceLevel}'. Must be one of: ${
                  validLevels.join(", ")
                }.`,
            },
          ],
          isError: true,
        };
      }
    }

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      "source-subplot-id": sourceSubplotId,
      "source-beat-id": sourceBeatId,
      "target-subplot-id": targetSubplotId,
      "target-beat-id": targetBeatId,
      summary,
    };

    if (typeof args.influenceDirection === "string") {
      commandArgs["influence-direction"] = args.influenceDirection;
    }

    if (typeof args.influenceLevel === "string") {
      commandArgs["influence-level"] = args.influenceLevel;
    }

    const handler = new ElementIntersectionCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
