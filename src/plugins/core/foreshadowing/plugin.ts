/**
 * ForeshadowingPlugin
 *
 * Foreshadowing要素の作成、検証、スキーマエクスポートを担当するプラグイン
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
import type { Foreshadowing } from "../../../type/v2/foreshadowing.ts";
import { validateForeshadowing } from "./validator.ts";
import { join } from "@std/path";

export class ForeshadowingPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.foreshadowing",
    version: "1.0.0",
    name: "Foreshadowing Element Plugin",
    description: "Manages Foreshadowing element creation and validation",
  };

  readonly elementType = "foreshadowing";

  /**
   * Foreshadowing要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからForeshadowingオブジェクトを構築
      const foreshadowing = options as Partial<Foreshadowing>;

      // 必須フィールドの検証
      if (
        !foreshadowing.id || !foreshadowing.name || !foreshadowing.type ||
        !foreshadowing.summary || !foreshadowing.planting ||
        !foreshadowing.status
      ) {
        return err(
          new Error(
            "Missing required fields: id, name, type, summary, planting, status",
          ),
        );
      }

      // デフォルト値の設定
      const fullForeshadowing: Foreshadowing = {
        id: foreshadowing.id,
        name: foreshadowing.name,
        type: foreshadowing.type,
        summary: foreshadowing.summary,
        planting: foreshadowing.planting,
        status: foreshadowing.status,
        ...(foreshadowing.importance &&
          { importance: foreshadowing.importance }),
        ...(foreshadowing.resolutions &&
          { resolutions: foreshadowing.resolutions }),
        ...(foreshadowing.plannedResolutionChapter &&
          { plannedResolutionChapter: foreshadowing.plannedResolutionChapter }),
        ...(foreshadowing.relations && { relations: foreshadowing.relations }),
        ...(foreshadowing.displayNames &&
          { displayNames: foreshadowing.displayNames }),
        ...(foreshadowing.details && { details: foreshadowing.details }),
        ...(foreshadowing.detectionHints &&
          { detectionHints: foreshadowing.detectionHints }),
      };

      // 検証
      const validationResult = validateForeshadowing(fullForeshadowing);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullForeshadowing);
      const filePath = `src/foreshadowings/${foreshadowing.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Foreshadowing要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateForeshadowing(element);
  }

  /**
   * Foreshadowing型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "foreshadowing",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Foreshadowing name" },
        type: {
          type: "ForeshadowingType",
          description:
            "Foreshadowing type (hint, prophecy, mystery, symbol, chekhov, red_herring)",
        },
        summary: { type: "string", description: "Short summary" },
        planting: {
          type: "PlantingInfo",
          description: "Information about where the foreshadowing was planted",
        },
        status: {
          type: "ForeshadowingStatus",
          description:
            "Current status (planted, partially_resolved, resolved, abandoned)",
        },
        importance: {
          type: "ForeshadowingImportance",
          description: "Importance level (major, minor, subtle)",
          optional: true,
        },
        resolutions: {
          type: "ResolutionInfo[]",
          description: "List of resolution information",
          optional: true,
        },
        plannedResolutionChapter: {
          type: "string",
          description: "Planned resolution chapter ID",
          optional: true,
        },
        relations: {
          type: "ForeshadowingRelations",
          description: "Related entities",
          optional: true,
        },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        details: {
          type: "ForeshadowingDetails",
          description: "Detailed information",
          optional: true,
        },
        detectionHints: {
          type: "ForeshadowingDetectionHints",
          description: "LSP detection hints",
          optional: true,
        },
      },
      required: ["id", "name", "type", "summary", "planting", "status"],
    };
  }

  /**
   * Foreshadowing要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "foreshadowings", `${elementId}.ts`);
  }

  /**
   * Foreshadowing詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "foreshadowings", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   */
  private generateTypeScriptFile(foreshadowing: Foreshadowing): string {
    // JSONを整形して出力
    const foreshadowingJson = JSON.stringify(foreshadowing, null, 2);

    return `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

/**
 * ${foreshadowing.name}
 * ${foreshadowing.summary}
 */
export const ${foreshadowing.id}: Foreshadowing = ${foreshadowingJson};
`;
  }
}
