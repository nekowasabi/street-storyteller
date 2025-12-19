/**
 * element_createツール定義
 * 物語要素（キャラクター、設定等）を作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { executeCliCommand } from "@storyteller/mcp/tools/cli_adapter.ts";
import { ElementCharacterCommand } from "@storyteller/cli/modules/element/character.ts";
import { ElementSettingCommand } from "@storyteller/cli/modules/element/setting.ts";

export const elementCreateTool: McpToolDefinition = {
  name: "element_create",
  description:
    "物語要素（キャラクター、設定等）を作成します。キャラクターと設定の作成をサポートします。",
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
      settingType: {
        type: "string",
        enum: ["location", "world", "culture", "organization"],
        description:
          "設定の種類（type='setting'の場合に必須）: location/world/culture/organization",
      },
      displayNames: {
        type: "array",
        items: { type: "string" },
        description: "表示名のバリエーション（設定用）",
      },
      relatedSettings: {
        type: "array",
        items: { type: "string" },
        description: "関連する設定のID（設定用）",
      },
    },
    required: ["type", "name"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const type = args.type as string | undefined;
    const name = args.name as string | undefined;
    const projectRoot = context?.projectRoot;

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

    const id = (args.id as string | undefined) ?? name;

    // 設定（Setting）の作成
    if (type === "setting") {
      const settingType = args.settingType as string | undefined;
      if (!settingType || typeof settingType !== "string") {
        return {
          content: [
            {
              type: "text" as const,
              text:
                "Error: 'settingType' parameter is required for type='setting' (location|world|culture|organization).",
            },
          ],
          isError: true,
        };
      }

      const settingArgs: Record<string, unknown> = {
        name,
        id,
        type: settingType,
      };

      if (typeof args.summary === "string") {
        settingArgs.summary = args.summary;
      }

      if (typeof args.displayNames === "string") {
        settingArgs.displayNames = args.displayNames;
      } else if (Array.isArray(args.displayNames)) {
        const displayNames = (args.displayNames as unknown[])
          .filter((n) => typeof n === "string")
          .map((n) => (n as string).trim())
          .filter((n) => n.length > 0);
        if (displayNames.length > 0) {
          settingArgs.displayNames = displayNames.join(",");
        }
      }

      if (typeof args.relatedSettings === "string") {
        settingArgs.relatedSettings = args.relatedSettings;
      } else if (Array.isArray(args.relatedSettings)) {
        const relatedSettings = (args.relatedSettings as unknown[])
          .filter((s) => typeof s === "string")
          .map((s) => (s as string).trim())
          .filter((s) => s.length > 0);
        if (relatedSettings.length > 0) {
          settingArgs.relatedSettings = relatedSettings.join(",");
        }
      }

      if (args.force === true) {
        settingArgs.force = true;
      }

      const handler = new ElementSettingCommand();
      return await executeCliCommand(handler, settingArgs, projectRoot);
    }

    // キャラクターの作成
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
    return await executeCliCommand(handler, commandArgs, projectRoot);
  },
};
