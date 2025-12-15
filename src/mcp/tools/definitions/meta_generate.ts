/**
 * meta_generateツール定義
 * 原稿からメタデータファイル(.meta.ts)を生成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { MetaGenerateCommand } from "../../../cli/modules/meta/generate.ts";

/**
 * meta_generateツール定義
 */
export const metaGenerateTool: McpToolDefinition = {
  name: "meta_generate",
  description:
    "原稿（Markdownファイル）からメタデータファイル（.meta.ts）を生成します。キャラクターや設定の参照を自動検出し、チャプターのメタデータを作成します。",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "対象のMarkdownファイルパス（例: manuscripts/chapter01.md）",
      },
      dir: {
        type: "string",
        description:
          "対象のディレクトリパス。ディレクトリ内のすべての.mdファイルを処理（例: manuscripts）",
      },
      recursive: {
        type: "boolean",
        description:
          "--dirと組み合わせて使用。サブディレクトリを再帰的に検索する場合はtrue",
      },
      preview: {
        type: "boolean",
        description:
          "検出されたエンティティとメタデータのプレビューを表示。ファイルは書き込まない",
      },
      dryRun: {
        type: "boolean",
        description:
          "メタデータを生成するが、出力ファイルは書き込まない（プレビュー確認用）",
      },
      force: {
        type: "boolean",
        description: "出力ファイルが既に存在する場合でも上書きする",
      },
      update: {
        type: "boolean",
        description:
          "既存ファイルの自動生成ブロックのみを更新（手動編集部分を保持）",
      },
      output: {
        type: "string",
        description: "出力ファイルパス（デフォルト: <markdown>.meta.ts）",
      },
      characters: {
        type: "string",
        description:
          "検出に含めるキャラクターIDのカンマ区切りリスト（frontmatterを上書き）",
      },
      settings: {
        type: "string",
        description:
          "検出に含める設定IDのカンマ区切りリスト（frontmatterを上書き）",
      },
      preset: {
        type: "string",
        description:
          "検証プリセット（battle-scene, romance-scene, dialogue, exposition）",
      },
    },
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    // pathまたはdirが必要
    const path = args.path as string | undefined;
    const dir = args.dir as string | undefined;
    const projectRoot = context?.projectRoot;

    if (!path && !dir) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              "Error: Either 'path' or 'dir' parameter is required. Use 'path' for a single file or 'dir' for a directory.",
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
    if (args.preview) {
      commandArgs.preview = true;
    }
    if (args.dryRun) {
      commandArgs["dry-run"] = true;
    }
    if (args.force) {
      commandArgs.force = true;
    }
    if (args.update) {
      commandArgs.update = true;
    }
    if (args.output) {
      commandArgs.output = args.output;
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

    // MetaGenerateCommandを実行
    const handler = new MetaGenerateCommand();
    return await executeCliCommand(handler, commandArgs, projectRoot);
  },
};
