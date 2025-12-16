/**
 * foreshadowing_createツール定義
 * 伏線要素を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ElementForeshadowingCommand } from "../../../cli/modules/element/foreshadowing.ts";

export const foreshadowingCreateTool: McpToolDefinition = {
  name: "foreshadowing_create",
  description:
    "伏線要素を作成します。物語の伏線（チェーホフの銃、予言、謎など）を管理するための構造を定義します。",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "伏線名",
      },
      type: {
        type: "string",
        enum: [
          "hint",
          "prophecy",
          "mystery",
          "symbol",
          "chekhov",
          "red_herring",
        ],
        description:
          "伏線の種類: hint（ヒント）, prophecy（予言）, mystery（謎）, symbol（象徴）, chekhov（チェーホフの銃）, red_herring（レッドヘリング）",
      },
      plantingChapter: {
        type: "string",
        description: "伏線が設置されるチャプターID",
      },
      plantingDescription: {
        type: "string",
        description: "伏線設置の説明",
      },
      summary: {
        type: "string",
        description: "伏線の概要",
      },
      id: {
        type: "string",
        description: "伏線ID（省略時はnameから自動生成）",
      },
      importance: {
        type: "string",
        enum: ["major", "minor", "subtle"],
        description: "重要度: major（主要）, minor（副次）, subtle（微妙）",
      },
      plannedResolutionChapter: {
        type: "string",
        description: "回収予定チャプターID",
      },
      relatedCharacters: {
        type: "array",
        items: { type: "string" },
        description: "関連キャラクターID",
      },
      relatedSettings: {
        type: "array",
        items: { type: "string" },
        description: "関連設定ID",
      },
      displayNames: {
        type: "array",
        items: { type: "string" },
        description: "表示名のバリエーション",
      },
    },
    required: ["name", "type", "plantingChapter", "plantingDescription"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const name = args.name as string | undefined;
    const type = args.type as string | undefined;
    const plantingChapter = args.plantingChapter as string | undefined;
    const plantingDescription = args.plantingDescription as string | undefined;

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
              "Error: 'type' parameter is required (hint|prophecy|mystery|symbol|chekhov|red_herring).",
          },
        ],
        isError: true,
      };
    }

    const validTypes = [
      "hint",
      "prophecy",
      "mystery",
      "symbol",
      "chekhov",
      "red_herring",
    ];
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

    if (
      !plantingChapter ||
      typeof plantingChapter !== "string" ||
      plantingChapter.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'plantingChapter' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (
      !plantingDescription ||
      typeof plantingDescription !== "string" ||
      plantingDescription.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'plantingDescription' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      name,
      type,
      "planting-chapter": plantingChapter,
      "planting-description": plantingDescription,
    };

    if (typeof args.summary === "string") {
      commandArgs.summary = args.summary;
    }

    if (typeof args.id === "string") {
      commandArgs.id = args.id;
    }

    if (typeof args.importance === "string") {
      commandArgs.importance = args.importance;
    }

    if (typeof args.plannedResolutionChapter === "string") {
      commandArgs["planned-resolution-chapter"] = args.plannedResolutionChapter;
    }

    if (Array.isArray(args.relatedCharacters)) {
      const chars = (args.relatedCharacters as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (chars.length > 0) {
        commandArgs["related-characters"] = chars.join(",");
      }
    }

    if (Array.isArray(args.relatedSettings)) {
      const settings = (args.relatedSettings as unknown[])
        .filter((s) => typeof s === "string")
        .map((s) => (s as string).trim())
        .filter((s) => s.length > 0);
      if (settings.length > 0) {
        commandArgs["related-settings"] = settings.join(",");
      }
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

    const handler = new ElementForeshadowingCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
