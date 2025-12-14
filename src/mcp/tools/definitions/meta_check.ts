/**
 * meta_checkツール定義
 * 原稿ファイルのメタデータ整合性を検証するMCPツール
 */

import type { McpToolDefinition } from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { MetaCheckCommand } from "../../../cli/modules/meta/check.ts";

/**
 * meta_checkツール定義
 */
export const metaCheckTool: McpToolDefinition = {
  name: "meta_check",
  description: "原稿ファイルのメタデータ整合性を検証します。指定されたMarkdownファイルまたはディレクトリ内のファイルに対してメタデータ生成が可能かを確認します。",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "検証するMarkdownファイルのパス（例: manuscripts/chapter01.md）",
      },
      dir: {
        type: "string",
        description: "検証するディレクトリのパス（例: manuscripts）",
      },
      recursive: {
        type: "boolean",
        description: "--dirと組み合わせて使用。サブディレクトリを再帰的に検索する場合はtrue",
      },
      characters: {
        type: "string",
        description: "検証に含めるキャラクターIDのカンマ区切りリスト（例: hero,heroine）",
      },
      settings: {
        type: "string",
        description: "検証に含める設定IDのカンマ区切りリスト（例: kingdom,forest）",
      },
      preset: {
        type: "string",
        description: "検証プリセット（battle-scene, romance-scene, dialogue, exposition）",
      },
    },
  },
  execute: async (args: Record<string, unknown>) => {
    // pathまたはdirが必要
    const path = args.path as string | undefined;
    const dir = args.dir as string | undefined;

    if (!path && !dir) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Either 'path' or 'dir' parameter is required. Use 'path' for a single file or 'dir' for a directory.",
          },
        ],
        isError: true,
      };
    }

    // CommandContext用の引数を構築
    const commandArgs: Record<string, unknown> = {};

    if (path) {
      commandArgs.extra = [path];
    }
    if (dir) {
      commandArgs.dir = dir;
    }
    if (args.recursive) {
      commandArgs.recursive = true;
    }
    if (args.characters) {
      commandArgs.characters = args.characters;
    }
    if (args.settings) {
      commandArgs.settings = args.settings;
    }
    if (args.preset) {
      commandArgs.preset = args.preset;
    }

    // MetaCheckCommandを実行
    const handler = new MetaCheckCommand();
    return await executeCliCommand(handler, commandArgs);
  },
};
