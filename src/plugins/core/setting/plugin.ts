/**
 * SettingPlugin
 *
 * Setting要素の作成、検証、スキーマエクスポートを担当するプラグイン
 */

import { err, ok } from "../../../shared/result.ts";
import type { Result } from "../../../shared/result.ts";
import type {
  CreateElementOptions,
  ElementCreationResult,
  ElementPlugin,
  PluginMetadata,
  TypeSchema,
  ValidationResult,
} from "../../../core/plugin_system.ts";
import type { Setting } from "../../../type/v2/setting.ts";
import { validateSetting } from "./validator.ts";
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
        ...(setting.relatedSettings && { relatedSettings: setting.relatedSettings }),
        ...(setting.detectionHints && { detectionHints: setting.detectionHints }),
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
   */
  private generateTypeScriptFile(setting: Setting): string {
    // JSONを整形して出力
    const settingJson = JSON.stringify(setting, null, 2);

    return `import type { Setting } from "@storyteller/types/v2/setting.ts";

/**
 * ${setting.name}
 * ${setting.summary}
 */
export const ${setting.id}: Setting = ${settingJson};
`;
  }
}
