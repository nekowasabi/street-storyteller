/**
 * element_createツール定義
 * 物語要素（キャラクター、設定等）を作成するMCPツール
 */

import type { McpToolDefinition } from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ElementCharacterCommand } from "../../../cli/modules/element/character.ts";

export const elementCreateTool: McpToolDefinition = {
  name: "element_create",
  description:
    "物語要素（キャラクター、設定等）を作成します。現在はキャラクター作成をサポートします。",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["character", "setting"],
        description: "要素タイプ",
      },
      name: {
        type: "string",
        description: "要素名（IDのデフォルトにも使用）",
      },
      id: {
        type: "string",
        description: "要素ID（省略時はnameを使用）",
      },
      role: {
        type: "string",
        description:
          "キャラクターの役割（protagonist/antagonist/supporting/guest）",
      },
      summary: {
        type: "string",
        description: "概要（1-2行）",
      },
      traits: {
        type: "array",
        items: { type: "string" },
        description: "特徴リスト",
      },
      withDetails: {
        type: "boolean",
        description: "詳細情報スケルトンを付与する",
      },
      addDetails: {
        type: "string",
        description:
          "追加する詳細項目のカンマ区切り（例: appearance,backstory）",
      },
      separateFiles: {
        type: "string",
        description: "詳細情報をファイル分離（all または カンマ区切り）",
      },
      force: {
        type: "boolean",
        description: "既存の詳細を上書きする",
      },
    },
    required: ["type", "name"],
  },
  execute: async (args: Record<string, unknown>) => {
    const type = args.type as string | undefined;
    const name = args.name as string | undefined;

    if (!type || typeof type !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'type' parameter is required (character|setting).",
          },
        ],
        isError: true,
      };
    }

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

    if (type !== "character" && type !== "setting") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Unsupported type: ${type}.`,
          },
        ],
        isError: true,
      };
    }

    // setting は未実装（将来拡張用）
    if (type === "setting") {
      return {
        content: [
          {
            type: "text" as const,
            text:
              "Error: 'setting' is not supported yet. Use type='character' for now.",
          },
        ],
        isError: true,
      };
    }

    const role = args.role as string | undefined;
    if (!role || typeof role !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'role' parameter is required for type='character'.",
          },
        ],
        isError: true,
      };
    }

    const id = (args.id as string | undefined) ?? name;

    // CommandContext用の引数を構築（CLIのオプション名に合わせる）
    const commandArgs: Record<string, unknown> = {
      name,
      id,
      role,
    };

    if (typeof args.summary === "string") {
      commandArgs.summary = args.summary;
    }

    if (Array.isArray(args.traits)) {
      const traits = (args.traits as unknown[]).filter((t) =>
        typeof t === "string"
      ).map((t) => (t as string).trim()).filter((t) => t.length > 0);
      if (traits.length > 0) {
        commandArgs.traits = traits.join(",");
      }
    } else if (typeof args.traits === "string") {
      commandArgs.traits = args.traits;
    }

    if (args.withDetails === true) {
      commandArgs["with-details"] = true;
    }
    if (
      typeof args.addDetails === "string" && args.addDetails.trim().length > 0
    ) {
      commandArgs["add-details"] = args.addDetails;
    }
    if (
      typeof args.separateFiles === "string" &&
      args.separateFiles.trim().length > 0
    ) {
      commandArgs["separate-files"] = args.separateFiles;
    }
    if (args.force === true) {
      commandArgs.force = true;
    }

    const handler = new ElementCharacterCommand();
    return await executeCliCommand(handler, commandArgs);
  },
};
