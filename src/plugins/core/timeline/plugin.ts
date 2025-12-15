/**
 * TimelinePlugin
 *
 * Timeline要素の作成、検証、スキーマエクスポートを担当するプラグイン
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
import type { Timeline } from "../../../type/v2/timeline.ts";
import { validateTimeline } from "./validator.ts";
import { join } from "@std/path";

export class TimelinePlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.timeline",
    version: "1.0.0",
    name: "Timeline Element Plugin",
    description: "Manages Timeline element creation and validation",
  };

  readonly elementType = "timeline";

  /**
   * Timeline要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからTimelineオブジェクトを構築
      const timeline = options as Partial<Timeline>;

      // 必須フィールドの検証
      if (
        !timeline.id || !timeline.name || !timeline.scope ||
        !timeline.summary
      ) {
        return err(
          new Error("Missing required fields: id, name, scope, summary"),
        );
      }

      // デフォルト値の設定
      const fullTimeline: Timeline = {
        id: timeline.id,
        name: timeline.name,
        scope: timeline.scope,
        summary: timeline.summary,
        events: timeline.events ?? [],
        ...(timeline.parentTimeline &&
          { parentTimeline: timeline.parentTimeline }),
        ...(timeline.childTimelines &&
          { childTimelines: timeline.childTimelines }),
        ...(timeline.relatedCharacter &&
          { relatedCharacter: timeline.relatedCharacter }),
        ...(timeline.displayNames && { displayNames: timeline.displayNames }),
        ...(timeline.displayOptions &&
          { displayOptions: timeline.displayOptions }),
        ...(timeline.details && { details: timeline.details }),
      };

      // 検証
      const validationResult = validateTimeline(fullTimeline);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullTimeline);
      const filePath = `src/timelines/${timeline.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Timeline要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateTimeline(element);
  }

  /**
   * Timeline型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "timeline",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Timeline name" },
        scope: {
          type: "TimelineScope",
          description: "Timeline scope (story, world, character, arc)",
        },
        summary: { type: "string", description: "Short summary" },
        events: {
          type: "TimelineEvent[]",
          description: "List of events in the timeline",
        },
        parentTimeline: {
          type: "string",
          description: "Parent timeline ID",
          optional: true,
        },
        childTimelines: {
          type: "string[]",
          description: "Child timeline IDs",
          optional: true,
        },
        relatedCharacter: {
          type: "string",
          description: "Related character ID for character-scoped timelines",
          optional: true,
        },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        displayOptions: {
          type: "TimelineDisplayOptions",
          description: "Display options",
          optional: true,
        },
        details: {
          type: "TimelineDetails",
          description: "Detailed information",
          optional: true,
        },
      },
      required: ["id", "name", "scope", "summary", "events"],
    };
  }

  /**
   * Timeline要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "timelines", `${elementId}.ts`);
  }

  /**
   * Timeline詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "timelines", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   */
  private generateTypeScriptFile(timeline: Timeline): string {
    // JSONを整形して出力
    const timelineJson = JSON.stringify(timeline, null, 2);

    return `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * ${timeline.name}
 * ${timeline.summary}
 */
export const ${timeline.id}: Timeline = ${timelineJson};
`;
  }
}
