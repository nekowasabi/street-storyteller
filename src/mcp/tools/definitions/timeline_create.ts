/**
 * timeline_createツール定義
 * タイムライン要素を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ElementTimelineCommand } from "../../../cli/modules/element/timeline.ts";

export const timelineCreateTool: McpToolDefinition = {
  name: "timeline_create",
  description:
    "タイムライン（時系列）要素を作成します。物語の時系列イベントを管理するための構造を定義します。",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "タイムライン名",
      },
      scope: {
        type: "string",
        enum: ["story", "world", "character", "arc"],
        description:
          "タイムラインのスコープ: story（物語全体）, world（世界史）, character（キャラクター固有）, arc（章・アーク単位）",
      },
      summary: {
        type: "string",
        description: "タイムラインの概要",
      },
      id: {
        type: "string",
        description: "タイムラインID（省略時はnameから自動生成）",
      },
      parentTimeline: {
        type: "string",
        description: "親タイムラインのID（サブタイムラインの場合）",
      },
      relatedCharacter: {
        type: "string",
        description: "関連キャラクターID（キャラクター固有タイムラインの場合）",
      },
      displayNames: {
        type: "array",
        items: { type: "string" },
        description: "表示名のバリエーション",
      },
    },
    required: ["name", "scope"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const name = args.name as string | undefined;
    const scope = args.scope as string | undefined;

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

    if (!scope || typeof scope !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text:
              "Error: 'scope' parameter is required (story|world|character|arc).",
          },
        ],
        isError: true,
      };
    }

    const validScopes = ["story", "world", "character", "arc"];
    if (!validScopes.includes(scope)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Invalid scope '${scope}'. Must be one of: ${
              validScopes.join(", ")
            }.`,
          },
        ],
        isError: true,
      };
    }

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      name,
      scope,
    };

    if (typeof args.summary === "string") {
      commandArgs.summary = args.summary;
    }

    if (typeof args.id === "string") {
      commandArgs.id = args.id;
    }

    if (typeof args.parentTimeline === "string") {
      commandArgs["parent-timeline"] = args.parentTimeline;
    }

    if (typeof args.relatedCharacter === "string") {
      commandArgs["related-character"] = args.relatedCharacter;
    }

    if (Array.isArray(args.displayNames)) {
      const displayNames = (args.displayNames as unknown[])
        .filter((n) => typeof n === "string")
        .map((n) => (n as string).trim())
        .filter((n) => n.length > 0);
      if (displayNames.length > 0) {
        commandArgs.displayNames = displayNames.join(",");
      }
    } else if (typeof args.displayNames === "string") {
      commandArgs.displayNames = args.displayNames;
    }

    const handler = new ElementTimelineCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
