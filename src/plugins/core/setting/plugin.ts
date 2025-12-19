/**
 * SettingPlugin
 *
 * Setting要素の作成、検証、スキーマエクスポートを担当するプラグイン
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { Result } from "@storyteller/shared/result.ts";
import type {
  CreateElementOptions,
  ElementCreationResult,
  ElementPlugin,
  PluginMetadata,
  TypeSchema,
  ValidationResult,
} from "@storyteller/core/plugin_system.ts";
import type { Setting } from "@storyteller/types/v2/setting.ts";
import { validateSetting } from "@storyteller/plugins/core/setting/validator.ts";
import { join } from "@std/path";

export class SettingPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.setting",
    version: "1.0.0",
    name: "Setting Element Plugin",
    description: "Manages Setting element creation and validation",
  };

  readonly elementType = "setting";

  /**
   * Setting要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからSettingオブジェクトを構築
      const setting = options as Partial<Setting>;

      // 必須フィールドの検証
      if (
        !setting.id || !setting.name || !setting.type || !setting.summary
      ) {
        return err(
          new Error("Missing required fields: id, name, type, summary"),
        );
      }

      // デフォルト値の設定
      const fullSetting: Setting = {
        id: setting.id,
        name: setting.name,
        type: setting.type,
        summary: setting.summary,
        appearingChapters: setting.appearingChapters ?? [],
        ...(setting.displayNames && { displayNames: setting.displayNames }),
        ...(setting.details && { details: setting.details }),
        ...(setting.relatedSettings &&
          { relatedSettings: setting.relatedSettings }),
        ...(setting.detectionHints &&
          { detectionHints: setting.detectionHints }),
      };

      // 検証
      const validationResult = validateSetting(fullSetting);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullSetting);
      const filePath = `src/settings/${setting.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Setting要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateSetting(element);
  }

  /**
   * Setting型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "setting",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Setting name" },
        type: {
          type: "SettingType",
          description: "Setting type (location, world, culture, organization)",
        },
        summary: { type: "string", description: "Short summary" },
        appearingChapters: {
          type: "string[]",
          description: "Chapters where setting appears",
        },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        details: {
          type: "SettingDetails",
          description: "Detailed information",
          optional: true,
        },
        relatedSettings: {
          type: "string[]",
          description: "Related setting IDs",
          optional: true,
        },
        detectionHints: {
          type: "SettingDetectionHints",
          description: "LSP detection hints",
          optional: true,
        },
      },
      required: ["id", "name", "type", "summary", "appearingChapters"],
    };
  }

  /**
   * Setting要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "settings", `${elementId}.ts`);
  }

  /**
   * Setting詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "settings", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   * 全フィールドをコメント付きで出力し、ユーザーが設定可能な項目を把握できるようにする
   */
  private generateTypeScriptFile(setting: Setting): string {
    // 値をJSONリテラルに変換するヘルパー
    const toJson = (value: unknown): string => JSON.stringify(value, null, 2);
    const indent = (str: string, spaces: number): string =>
      str.split("\n").map((line, i) =>
        i === 0 ? line : " ".repeat(spaces) + line
      ).join("\n");

    return `import type { Setting } from "@storyteller/types/v2/setting.ts";

/**
 * ${setting.name}
 * ${setting.summary}
 */
export const ${setting.id}: Setting = {
  // =============================================
  // 必須メタデータ
  // =============================================

  /** 一意なID（プログラム的な識別子） */
  id: ${toJson(setting.id)},

  /** 設定名（物語内での名前） */
  name: ${toJson(setting.name)},

  /** 設定の種類: "location" | "world" | "culture" | "organization" */
  type: ${toJson(setting.type)},

  /** 登場するチャプターのIDリスト */
  appearingChapters: ${indent(toJson(setting.appearingChapters ?? []), 2)},

  /** 短い概要（必須） */
  summary: ${toJson(setting.summary)},

  // =============================================
  // 表示・検出設定（オプショナル）
  // =============================================

  /** 表示名のバリエーション（例: ["王都", "首都"]） - 原稿での検出に使用 */
  displayNames: ${indent(toJson(setting.displayNames ?? []), 2)},

  // =============================================
  // 詳細情報（オプショナル）
  // =============================================

  /** 詳細情報 - 各フィールドは文字列 or { file: "path/to/file.md" } */
  details: {
    /** 設定の説明（summaryより詳細な説明） */
    description: "",
    /** 地理情報 */
    geography: "",
    /** 歴史 */
    history: "",
    /** 文化 */
    culture: "",
    /** 政治 */
    politics: "",
    /** 経済 */
    economy: "",
    /** 住民 */
    inhabitants: "",
    /** ランドマーク */
    landmarks: "",
  },

  // =============================================
  // 関連設定（オプショナル）
  // =============================================

  /** 関連する設定のIDリスト */
  relatedSettings: [],

  // =============================================
  // LSP検出ヒント（オプショナル）
  // =============================================

  /** LSP用の検出ヒント - 原稿から設定を自動検出する際の設定 */
  detectionHints: {
    /** よく使われるパターン（例: ["王都の", "王都で"]） */
    commonPatterns: [],
    /** 除外すべきパターン */
    excludePatterns: [],
    /** 検出の信頼度（0.0～1.0） */
    confidence: 1.0,
  },
};
`;
  }
}
