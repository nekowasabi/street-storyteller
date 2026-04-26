/**
 * beat_createツール定義
 * プロットビート要素を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { executeCliCommand } from "@storyteller/mcp/tools/cli_adapter.ts";
import { ElementBeatCommand } from "@storyteller/cli/modules/element/beat.ts";

export const beatCreateTool: McpToolDefinition = {
  name: "beat_create",
  description:
    "プロットビート要素を作成します。サブプロット内の個別のストーリービート（セットアップ、ライジング、クライマックス、フォーリング、レゾリューション）を定義します。",
  inputSchema: {
    type: "object",
    properties: {
      subplotId: {
        type: "string",
        description: "所属するサブプロットID",
      },
      title: {
        type: "string",
        description: "ビートのタイトル",
      },
      summary: {
        type: "string",
        description: "ビートの概要",
      },
      chapter: {
        type: "string",
        description: "関連チャプターID",
      },
      structurePosition: {
        type: "string",
        enum: ["setup", "rising", "climax", "falling", "resolution"],
        description:
          "物語構造上の位置: setup（設定）, rising（上昇）, climax（クライマックス）, falling（下降）, resolution（解決）",
      },
      characters: {
        type: "array",
        items: { type: "string" },
        description: "関連キャラクターID",
      },
      settings: {
        type: "array",
        items: { type: "string" },
        description: "関連設定ID",
      },
      preconditionBeatIds: {
        type: "array",
        items: { type: "string" },
        description: "前提条件となるビートID（因果関係）",
      },
      timelineEventId: {
        type: "string",
        description: "関連タイムラインイベントID",
      },
    },
    required: ["subplotId", "title", "summary"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const subplotId = args.subplotId as string | undefined;
    const title = args.title as string | undefined;
    const summary = args.summary as string | undefined;

    if (
      !subplotId || typeof subplotId !== "string" || subplotId.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'subplotId' parameter is required.",
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

    // structurePositionの検証
    if (typeof args.structurePosition === "string") {
      const validPositions = [
        "setup",
        "rising",
        "climax",
        "falling",
        "resolution",
      ];
      if (!validPositions.includes(args.structurePosition)) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Invalid structurePosition '${args.structurePosition}'. Must be one of: ${
                  validPositions.join(", ")
                }.`,
            },
          ],
          isError: true,
        };
      }
    }

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      "subplot-id": subplotId,
      title,
      summary,
    };

    if (typeof args.chapter === "string") {
      commandArgs.chapter = args.chapter;
    }

    if (typeof args.structurePosition === "string") {
      commandArgs["structure-position"] = args.structurePosition;
    }

    if (Array.isArray(args.characters)) {
      const chars = (args.characters as unknown[])
        .filter((c) => typeof c === "string")
        .map((c) => (c as string).trim())
        .filter((c) => c.length > 0);
      if (chars.length > 0) {
        commandArgs.characters = chars.join(",");
      }
    }

    if (Array.isArray(args.settings)) {
      const settings = (args.settings as unknown[])
        .filter((s) => typeof s === "string")
        .map((s) => (s as string).trim())
        .filter((s) => s.length > 0);
      if (settings.length > 0) {
        commandArgs.settings = settings.join(",");
      }
    }

    if (Array.isArray(args.preconditionBeatIds)) {
      const beats = (args.preconditionBeatIds as unknown[])
        .filter((b) => typeof b === "string")
        .map((b) => (b as string).trim())
        .filter((b) => b.length > 0);
      if (beats.length > 0) {
        commandArgs["precondition-beat-ids"] = beats.join(",");
      }
    }

    if (typeof args.timelineEventId === "string") {
      commandArgs["timeline-event-id"] = args.timelineEventId;
    }

    const handler = new ElementBeatCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
