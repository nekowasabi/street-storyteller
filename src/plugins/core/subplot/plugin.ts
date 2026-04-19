/**
 * SubplotPlugin
 *
 * Subplot要素の作成、検証、スキーマエクスポートを担当するプラグイン
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
import type { Subplot } from "@storyteller/types/v2/subplot.ts";
import { validateSubplot } from "@storyteller/plugins/core/subplot/validator.ts";
import { join } from "@std/path";

export class SubplotPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.subplot",
    version: "1.0.0",
    name: "Subplot Element Plugin",
    description: "Manages Subplot element creation and validation",
  };

  readonly elementType = "subplot";

  /**
   * Subplot要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからSubplotオブジェクトを構築
      const subplot = options as Partial<Subplot>;

      // 必須フィールドの検証
      if (
        !subplot.id || !subplot.name || !subplot.type ||
        !subplot.summary || !subplot.beats ||
        !subplot.focusCharacters
      ) {
        return err(
          new Error(
            "Missing required fields: id, name, type, summary, beats, focusCharacters",
          ),
        );
      }

      // デフォルト値の設定
      const fullSubplot: Subplot = {
        id: subplot.id,
        name: subplot.name,
        type: subplot.type,
        summary: subplot.summary,
        beats: subplot.beats,
        focusCharacters: subplot.focusCharacters,
        ...(subplot.relatedCharacters &&
          { relatedCharacters: subplot.relatedCharacters }),
        ...(subplot.structureTemplateId &&
          { structureTemplateId: subplot.structureTemplateId }),
        ...(subplot.parentPlotId && { parentPlotId: subplot.parentPlotId }),
        ...(subplot.childPlotIds && { childPlotIds: subplot.childPlotIds }),
        ...(subplot.themes && { themes: subplot.themes }),
        ...(subplot.importance && { importance: subplot.importance }),
        ...(subplot.displayNames && { displayNames: subplot.displayNames }),
        ...(subplot.details && { details: subplot.details }),
        ...(subplot.detectionHints &&
          { detectionHints: subplot.detectionHints }),
      };

      // 検証
      const validationResult = validateSubplot(fullSubplot);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullSubplot);
      const filePath = `src/subplots/${subplot.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Subplot要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateSubplot(element);
  }

  /**
   * Subplot型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "subplot",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Subplot name" },
        type: {
          type: "PlotType",
          description: "Plot type (main, subplot, parallel, background)",
        },
        summary: { type: "string", description: "Short summary" },
        beats: {
          type: "PlotBeat[]",
          description: "Plot beats (key points in the story)",
        },
        focusCharacters: {
          type: "FocusCharacter[]",
          description: "Characters this plot focuses on",
        },
        relatedCharacters: {
          type: "string[]",
          description: "Related character IDs (non-focus)",
          optional: true,
        },
        structureTemplateId: {
          type: "string",
          description: "Structure template ID",
          optional: true,
        },
        parentPlotId: {
          type: "string",
          description: "Parent plot ID (for subplots)",
          optional: true,
        },
        childPlotIds: {
          type: "string[]",
          description: "Child plot IDs",
          optional: true,
        },
        themes: {
          type: "string[]",
          description: "Themes this plot explores",
          optional: true,
        },
        importance: {
          type: "PlotImportance",
          description: "Importance level (major, minor, supporting)",
          optional: true,
        },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        details: {
          type: "SubplotDetails",
          description: "Detailed information",
          optional: true,
        },
        detectionHints: {
          type: "SubplotDetectionHints",
          description: "LSP detection hints",
          optional: true,
        },
      },
      required: [
        "id",
        "name",
        "type",
        "summary",
        "beats",
        "focusCharacters",
      ],
    };
  }

  /**
   * Subplot要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "subplots", `${elementId}.ts`);
  }

  /**
   * Subplot詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "subplots", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   */
  private generateTypeScriptFile(subplot: Subplot): string {
    // JSONを整形して出力
    const subplotJson = JSON.stringify(subplot, null, 2);

    return `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * ${subplot.name}
 * ${subplot.summary}
 */
export const ${subplot.id}: Subplot = ${subplotJson};
`;
  }
}
