/**
 * event_createツール定義
 * タイムラインにイベントを追加するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ElementEventCommand } from "../../../cli/modules/element/event.ts";

/**
 * 有効なイベントカテゴリ
 */
const validCategories = [
  "plot_point",
  "character_event",
  "world_event",
  "backstory",
  "foreshadow",
  "climax",
  "resolution",
];

export const eventCreateTool: McpToolDefinition = {
  name: "event_create",
  description:
    "既存のタイムラインにイベントを追加します。物語の出来事をタイムライン上に配置し、因果関係を記録できます。",
  inputSchema: {
    type: "object",
    properties: {
      timelineId: {
        type: "string",
        description: "イベントを追加するタイムラインのID",
      },
      title: {
        type: "string",
        description: "イベントのタイトル",
      },
      category: {
        type: "string",
        enum: validCategories,
        description:
          "イベントのカテゴリ: plot_point（プロットポイント）, character_event（キャラクターイベント）, world_event（世界イベント）, backstory（バックストーリー）, foreshadow（伏線）, climax（クライマックス）, resolution（解決）",
      },
      order: {
        type: "number",
        description: "タイムライン上の順序（数値）",
      },
      summary: {
        type: "string",
        description: "イベントの概要",
      },
      id: {
        type: "string",
        description: "イベントID（省略時はtitleから自動生成）",
      },
      characters: {
        type: "array",
        items: { type: "string" },
        description: "関連するキャラクターIDのリスト",
      },
      settings: {
        type: "array",
        items: { type: "string" },
        description: "関連する設定（場所等）IDのリスト",
      },
      chapters: {
        type: "array",
        items: { type: "string" },
        description: "関連するチャプターIDのリスト",
      },
      causedBy: {
        type: "array",
        items: { type: "string" },
        description: "このイベントの原因となるイベントIDのリスト",
      },
      causes: {
        type: "array",
        items: { type: "string" },
        description: "このイベントが引き起こすイベントIDのリスト",
      },
      importance: {
        type: "string",
        enum: ["major", "minor", "background"],
        description: "イベントの重要度",
      },
    },
    required: ["timelineId", "title", "category", "order"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const timelineId = args.timelineId as string | undefined;
    const title = args.title as string | undefined;
    const category = args.category as string | undefined;
    const order = args.order as number | undefined;

    // 必須パラメータのチェック
    if (
      !timelineId || typeof timelineId !== "string" || timelineId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'timelineId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!title || typeof title !== "string" || title.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'title' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!category || typeof category !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'category' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!validCategories.includes(category)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Invalid category '${category}'. Must be one of: ${
              validCategories.join(", ")
            }.`,
          },
        ],
        isError: true,
      };
    }

    if (order === undefined || typeof order !== "number") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'order' parameter is required and must be a number.",
          },
        ],
        isError: true,
      };
    }

    // CLIコマンド用の引数を構築（CLIの引数名にマッピング）
    const commandArgs: Record<string, unknown> = {
      timeline: timelineId, // MCP: timelineId → CLI: timeline
      title,
      category,
      order,
    };

    if (typeof args.summary === "string") {
      commandArgs.summary = args.summary;
    }

    if (typeof args.id === "string") {
      commandArgs.id = args.id;
    }

    // 配列パラメータをカンマ区切り文字列に変換
    if (Array.isArray(args.characters)) {
      const characters = (args.characters as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (characters.length > 0) {
        commandArgs.characters = characters.join(",");
      }
    } else if (typeof args.characters === "string") {
      commandArgs.characters = args.characters;
    }

    if (Array.isArray(args.settings)) {
      const settings = (args.settings as unknown[])
        .filter((s) => typeof s === "string")
        .map((s) => (s as string).trim())
        .filter((s) => s.length > 0);
      if (settings.length > 0) {
        commandArgs.settings = settings.join(",");
      }
    } else if (typeof args.settings === "string") {
      commandArgs.settings = args.settings;
    }

    if (Array.isArray(args.chapters)) {
      const chapters = (args.chapters as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (chapters.length > 0) {
        commandArgs.chapters = chapters.join(",");
      }
    } else if (typeof args.chapters === "string") {
      commandArgs.chapters = args.chapters;
    }

    if (Array.isArray(args.causedBy)) {
      const causedBy = (args.causedBy as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (causedBy.length > 0) {
        commandArgs["caused-by"] = causedBy.join(",");
      }
    } else if (typeof args.causedBy === "string") {
      commandArgs["caused-by"] = args.causedBy;
    }

    if (Array.isArray(args.causes)) {
      const causes = (args.causes as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (causes.length > 0) {
        commandArgs.causes = causes.join(",");
      }
    } else if (typeof args.causes === "string") {
      commandArgs.causes = args.causes;
    }

    if (typeof args.importance === "string") {
      commandArgs.importance = args.importance;
    }

    const handler = new ElementEventCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
