/**
 * subplot_createツール定義
 * サブプロット要素を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { executeCliCommand } from "@storyteller/mcp/tools/cli_adapter.ts";
import { ElementSubplotCommand } from "@storyteller/cli/modules/element/subplot.ts";

export const subplotCreateTool: McpToolDefinition = {
  name: "subplot_create",
  description:
    "サブプロット要素を作成します。物語のプロット構造（メインプロット、サブプロット、並行プロット、背景プロット）を管理するための構造を定義します。",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "サブプロット名",
      },
      type: {
        type: "string",
        enum: ["main", "subplot", "parallel", "background"],
        description:
          "プロットタイプ: main（メインプロット）, subplot（サブプロット）, parallel（並行プロット）, background（背景プロット）",
      },
      summary: {
        type: "string",
        description: "サブプロットの概要",
      },
      importance: {
        type: "string",
        enum: ["major", "minor", "subtle"],
        description: "重要度: major（主要）, minor（副次）, subtle（微妙）",
      },
      // Why: McpPropertySchemaがネストされたobject propertiesをサポートしないため、
      // "characterId:weight" 形式の文字列配列で表現する
      focusCharacters: {
        type: "array",
        items: { type: "string" },
        description:
          "フォーカスキャラクター（\"characterId:weight\"形式の配列。weight: primary/secondary）",
      },
      parentSubplot: {
        type: "string",
        description: "親サブプロットID",
      },
    },
    required: ["name", "type", "summary"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const name = args.name as string | undefined;
    const type = args.type as string | undefined;
    const summary = args.summary as string | undefined;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'name' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!type || typeof type !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text:
              "Error: 'type' parameter is required (main|subplot|parallel|background).",
          },
        ],
        isError: true,
      };
    }

    const validTypes = ["main", "subplot", "parallel", "background"];
    if (!validTypes.includes(type)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Invalid type '${type}'. Must be one of: ${
              validTypes.join(", ")
            }.`,
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

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      name,
      type,
      summary,
    };

    if (typeof args.importance === "string") {
      commandArgs.importance = args.importance;
    }

    if (Array.isArray(args.focusCharacters)) {
      const chars = (args.focusCharacters as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (chars.length > 0) {
        commandArgs["focus-characters"] = chars.join(",");
      }
    }

    if (typeof args.parentSubplot === "string") {
      commandArgs["parent-subplot"] = args.parentSubplot;
    }

    const handler = new ElementSubplotCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
