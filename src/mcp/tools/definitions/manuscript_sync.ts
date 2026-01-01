/**
 * manuscript_sync MCPツール
 *
 * 原稿ファイルのFrontMatterを検出されたエンティティと自動同期する
 */
import { isAbsolute, join } from "@std/path";
import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "@storyteller/mcp/tools/tool_registry.ts";
import { loadEntities } from "@storyteller/cli/modules/lsp/start.ts";
import {
  FrontmatterSyncService,
  type SyncOptions,
} from "@storyteller/application/meta/frontmatter_sync_service.ts";
import type { BindableEntityType } from "@storyteller/application/meta/frontmatter_editor.ts";

/**
 * 有効なモード値
 */
const VALID_MODES = ["add", "sync", "preview"] as const;
type ValidMode = (typeof VALID_MODES)[number];

/**
 * manuscript_sync ツール定義
 */
export const manuscriptSyncTool: McpToolDefinition = {
  name: "manuscript_sync",
  description:
    "原稿ファイルのFrontMatterを検出されたエンティティと同期します。" +
    "テキスト内のキャラクター・設定・伏線参照を検出し、FrontMatterに自動追加または同期します。",
  inputSchema: {
    type: "object",
    properties: {
      manuscript: {
        type: "string",
        description: "原稿ファイルパス（相対または絶対パス）",
      },
      mode: {
        type: "string",
        enum: ["add", "sync", "preview"],
        description:
          "モード: add=追加のみ（デフォルト）、sync=検出結果で置換、preview=プレビューのみ",
      },
      entityTypes: {
        type: "array",
        items: { type: "string" },
        description:
          "対象エンティティタイプ（デフォルト: characters, settings, foreshadowings）",
      },
      confidenceThreshold: {
        type: "number",
        description: "信頼度閾値（0.0-1.0、デフォルト: 0.85）",
      },
    },
    required: ["manuscript"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const projectRoot = context?.projectRoot ?? Deno.cwd();

    // パラメータ抽出
    const manuscript = args.manuscript as string | undefined;
    const mode = (args.mode as ValidMode) ?? "add";
    const entityTypes = args.entityTypes as string[] | undefined;
    const confidenceThreshold = (args.confidenceThreshold as number) ?? 0.85;

    // 必須パラメータバリデーション
    if (!manuscript || typeof manuscript !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'manuscript' パラメータは必須です。",
          },
        ],
        isError: true,
      };
    }

    // モードバリデーション
    if (!VALID_MODES.includes(mode)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 'mode' は ${
              VALID_MODES.join(", ")
            } のいずれかである必要があります。`,
          },
        ],
        isError: true,
      };
    }

    // 原稿ファイルパス解決
    const manuscriptPath = isAbsolute(manuscript)
      ? manuscript
      : join(projectRoot, manuscript);

    // ファイル存在確認
    try {
      await Deno.stat(manuscriptPath);
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 原稿ファイルが見つかりません: ${manuscript}`,
          },
        ],
        isError: true,
      };
    }

    // エンティティロード
    const entities = await loadEntities(projectRoot);
    const service = new FrontmatterSyncService(projectRoot, entities);

    // 同期オプション設定
    const isPreview = mode === "preview";
    const syncMode: SyncOptions["mode"] = mode === "sync" ? "sync" : "add";

    const syncOptions: Partial<SyncOptions> = {
      mode: syncMode,
      dryRun: isPreview,
      confidenceThreshold,
      ...(entityTypes && entityTypes.length > 0
        ? { entityTypes: entityTypes as BindableEntityType[] }
        : {}),
    };

    // 同期実行
    const result = await service.sync(manuscriptPath, syncOptions);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${result.error.message}`,
          },
        ],
        isError: true,
      };
    }

    // 結果フォーマット
    const { value } = result;
    const addedInfo = value.added
      .map((a) => `  ${a.type}: ${a.ids.join(", ")}`)
      .join("\n");
    const removedInfo = value.removed
      .map((r) => `  ${r.type}: ${r.ids.join(", ")}`)
      .join("\n");

    let responseText: string;
    if (isPreview) {
      responseText = `プレビュー: ${manuscript}\n\n`;
      if (value.changed) {
        if (addedInfo) {
          responseText += `追加予定:\n${addedInfo}\n`;
        }
        if (removedInfo) {
          responseText += `削除予定:\n${removedInfo}\n`;
        }
      } else {
        responseText += "変更なし";
      }
    } else {
      responseText = `同期完了: ${manuscript}\n\n`;
      if (value.changed) {
        if (addedInfo) {
          responseText += `追加:\n${addedInfo}\n`;
        }
        if (removedInfo) {
          responseText += `削除:\n${removedInfo}\n`;
        }
      } else {
        responseText += "変更なし";
      }
      responseText += `\n処理時間: ${value.durationMs}ms`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: responseText,
        },
      ],
      isError: false,
    };
  },
};
