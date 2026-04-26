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
      // Why: focusCharacters, status are optional in canonical Subplot type
      if (
        !subplot.id || !subplot.name || !subplot.type ||
        !subplot.summary || !subplot.beats
      ) {
        return err(
          new Error(
            "Missing required fields: id, name, type, summary, beats",
          ),
        );
      }

      // デフォルト値の設定
      // Why: Only properties that exist on the canonical Subplot type are included.
      //       Removed: relatedCharacters, structureTemplateId, parentPlotId,
      //       childPlotIds, themes, detectionHints (none exist on Subplot).
      const fullSubplot: Subplot = {
        id: subplot.id,
        name: subplot.name,
        type: subplot.type,
        status: subplot.status ?? "active",
        summary: subplot.summary,
        beats: subplot.beats,
        ...(subplot.focusCharacters &&
          { focusCharacters: subplot.focusCharacters }),
        ...(subplot.intersections &&
          { intersections: subplot.intersections }),
        ...(subplot.importance && { importance: subplot.importance }),
        ...(subplot.parentSubplotId &&
          { parentSubplotId: subplot.parentSubplotId }),
        ...(subplot.displayNames && { displayNames: subplot.displayNames }),
        ...(subplot.details && { details: subplot.details }),
        ...(subplot.relations && { relations: subplot.relations }),
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
    // Why: Properties aligned with canonical Subplot type in src/type/v2/subplot.ts
    return {
      type: "subplot",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Subplot name" },
        type: {
          type: "SubplotType",
          description: "Subplot type (main, subplot, parallel, background)",
        },
        status: {
          type: "SubplotStatus",
          description: "Lifecycle status (active, completed)",
        },
        summary: { type: "string", description: "Short summary" },
        beats: {
          type: "PlotBeat[]",
          description: "Plot beats (key points in the story)",
        },
        focusCharacters: {
          type: "Record<string, SubplotFocusCharacterWeight>",
          description: "Focus characters and their involvement weight",
          optional: true,
        },
        intersections: {
          type: "PlotIntersection[]",
          description: "Intersection points with other subplots",
          optional: true,
        },
        importance: {
          type: "SubplotImportance",
          description: "Importance level (major, minor)",
          optional: true,
        },
        parentSubplotId: {
          type: "string",
          description: "Parent subplot ID (for hierarchical structure)",
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
        relations: {
          type: "SubplotRelations",
          description:
            "Related entities (characters, settings, foreshadowings, relatedSubplots)",
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
