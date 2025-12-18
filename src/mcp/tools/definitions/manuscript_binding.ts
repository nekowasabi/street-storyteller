/**
 * manuscript_binding MCPツール定義
 * 原稿ファイルのFrontmatterにエンティティを紐付け・編集・削除する
 */

import { isAbsolute, join } from "@std/path";
import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import {
  type BindableEntityType,
  FrontmatterEditor,
} from "../../../application/meta/frontmatter_editor.ts";
import {
  EntityValidator,
  type ValidatableEntityType,
} from "../../../application/meta/entity_validator.ts";

/**
 * 有効なアクション
 */
const VALID_ACTIONS = ["add", "remove", "set"] as const;
type ValidAction = typeof VALID_ACTIONS[number];

/**
 * 有効なエンティティタイプ
 */
const VALID_ENTITY_TYPES: BindableEntityType[] = [
  "characters",
  "settings",
  "foreshadowings",
  "timeline_events",
  "phases",
  "timelines",
];

/**
 * manuscript_binding MCPツール
 */
export const manuscriptBindingTool: McpToolDefinition = {
  name: "manuscript_binding",
  description:
    "原稿ファイル（Markdown）のFrontMatterにエンティティ（キャラクター、設定、伏線など）を紐付け・編集・削除します。",
  inputSchema: {
    type: "object",
    properties: {
      manuscript: {
        type: "string",
        description: "原稿ファイルパス（相対または絶対パス）",
      },
      action: {
        type: "string",
        enum: ["add", "remove", "set"],
        description:
          "操作タイプ: add=追加（重複無視）、remove=削除、set=完全置換",
      },
      entityType: {
        type: "string",
        enum: [
          "characters",
          "settings",
          "foreshadowings",
          "timeline_events",
          "phases",
          "timelines",
        ],
        description: "エンティティタイプ",
      },
      ids: {
        type: "array",
        items: { type: "string" },
        description: "エンティティIDリスト",
      },
      validate: {
        type: "boolean",
        description: "ID存在確認を行うか（デフォルト: true）",
      },
    },
    required: ["manuscript", "action", "entityType", "ids"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const projectRoot = context?.projectRoot ?? Deno.cwd();

    // パラメータ抽出
    const manuscript = args.manuscript as string | undefined;
    const action = args.action as string | undefined;
    const entityType = args.entityType as string | undefined;
    const ids = args.ids as string[] | undefined;
    const validate = args.validate !== false; // デフォルトtrue

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

    if (!action || typeof action !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'action' パラメータは必須です。",
          },
        ],
        isError: true,
      };
    }

    if (!entityType || typeof entityType !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'entityType' パラメータは必須です。",
          },
        ],
        isError: true,
      };
    }

    if (!ids || !Array.isArray(ids)) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'ids' パラメータは必須です。",
          },
        ],
        isError: true,
      };
    }

    // enum値バリデーション
    if (!VALID_ACTIONS.includes(action as ValidAction)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 'action' は ${
              VALID_ACTIONS.join(", ")
            } のいずれかである必要があります。`,
          },
        ],
        isError: true,
      };
    }

    if (!VALID_ENTITY_TYPES.includes(entityType as BindableEntityType)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 'entityType' は ${
              VALID_ENTITY_TYPES.join(", ")
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

    // IDバリデーション（validate=trueの場合）
    if (validate && ids.length > 0) {
      const validator = new EntityValidator(projectRoot);
      const validationResult = await validator.validateIds(
        entityType as ValidatableEntityType,
        ids,
      );

      if (!validationResult.valid) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: 存在しないIDが含まれています: ${
                validationResult.invalidIds.join(", ")
              }`,
            },
          ],
          isError: true,
        };
      }
    }

    // 原稿ファイル読み込み
    let content: string;
    try {
      content = await Deno.readTextFile(manuscriptPath);
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 原稿ファイルの読み込みに失敗しました: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }

    // FrontmatterEditor で編集
    const editor = new FrontmatterEditor();
    let editResult;

    switch (action as ValidAction) {
      case "add":
        editResult = editor.addEntities(
          content,
          entityType as BindableEntityType,
          ids,
        );
        break;
      case "remove":
        editResult = editor.removeEntities(
          content,
          entityType as BindableEntityType,
          ids,
        );
        break;
      case "set":
        editResult = editor.setEntities(
          content,
          entityType as BindableEntityType,
          ids,
        );
        break;
    }

    if (!editResult.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: FrontMatter編集エラー: ${editResult.error.message}`,
          },
        ],
        isError: true,
      };
    }

    // ファイル書き込み
    try {
      await Deno.writeTextFile(manuscriptPath, editResult.value.content);
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: 原稿ファイルの書き込みに失敗しました: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }

    // 成功レスポンス
    const actionLabel = {
      add: "追加",
      remove: "削除",
      set: "置換",
    }[action as ValidAction];

    const changedInfo = {
      add: editResult.value.addedIds,
      remove: editResult.value.removedIds,
      set: ids,
    }[action as ValidAction];

    return {
      content: [
        {
          type: "text" as const,
          text:
            `成功: ${manuscript} の ${entityType} を${actionLabel}しました。\n` +
            `対象ID: ${changedInfo.join(", ") || "(なし)"}`,
        },
      ],
      isError: false,
    };
  },
};
