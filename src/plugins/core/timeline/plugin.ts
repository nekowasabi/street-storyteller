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
   * 全フィールドをコメント付きで出力し、ユーザーが設定可能な項目を把握できるようにする
   */
  private generateTypeScriptFile(timeline: Timeline): string {
    // 値をJSONリテラルに変換するヘルパー
    const toJson = (value: unknown): string => JSON.stringify(value, null, 2);
    const indent = (str: string, spaces: number): string =>
      str.split("\n").map((line, i) =>
        i === 0 ? line : " ".repeat(spaces) + line
      ).join("\n");

    // displayOptionsのデフォルト値をマージ
    const displayOptions = {
      showRelations: true,
      colorScheme: "",
      collapsed: false,
      ...timeline.displayOptions,
    };

    // detailsのデフォルト値をマージ
    const details = {
      background: "",
      notes: "",
      ...timeline.details,
    };

    // イベントがある場合はそのままJSON出力、ない場合はテンプレートコメントを表示
    const eventsSection = timeline.events.length > 0
      ? `/** イベントリスト */
  events: ${indent(toJson(timeline.events), 2)},`
      : `/** イベントリスト */
  events: [
    // イベントのテンプレート（使用時はコメントを外してください）
    // {
    //   // === 必須フィールド ===
    //   id: "event_001",
    //   title: "イベントタイトル",
    //   category: "plot_point",  // "plot_point" | "character_event" | "world_event" | "backstory" | "foreshadow" | "climax" | "resolution"
    //   time: {
    //     order: 1,              // タイムライン内での順序（必須）
    //     label: "",             // 表示用の時間表記
    //     date: "",              // 物語内での日付表記
    //     chapter: "",           // 関連するチャプターID
    //   },
    //   summary: "イベントの概要",
    //   characters: [],          // 関連キャラクターIDリスト
    //   settings: [],            // 関連設定IDリスト
    //   chapters: [],            // 関連チャプターIDリスト
    //
    //   // === オプショナルフィールド ===
    //   causedBy: [],            // このイベントの原因となったイベントIDリスト
    //   causes: [],              // このイベントが引き起こすイベントIDリスト
    //   importance: "major",     // "major" | "minor" | "background"
    //   endTime: undefined,      // イベント終了時点（期間があるイベントの場合）
    //   displayNames: [],        // 表示名のバリエーション
    //   details: {
    //     description: "",       // 詳細説明
    //     impact: "",            // イベントの影響
    //     notes: "",             // メモ
    //   },
    //   detectionHints: {
    //     commonPatterns: [],
    //     excludePatterns: [],
    //     confidence: 1.0,
    //   },
    //   phaseChanges: [          // キャラクターフェーズ変化
    //     // { characterId: "hero", toPhaseId: "phase_02", fromPhaseId: "phase_01", description: "" }
    //   ],
    // },
  ],`;

    return `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * ${timeline.name}
 * ${timeline.summary}
 */
export const ${timeline.id}: Timeline = {
  // =============================================
  // 必須メタデータ
  // =============================================

  /** 一意なID（プログラム的な識別子） */
  id: ${toJson(timeline.id)},

  /** タイムライン名 */
  name: ${toJson(timeline.name)},

  /** タイムラインのスコープ: "story" | "world" | "character" | "arc" */
  scope: ${toJson(timeline.scope)},

  /** 短い概要（必須） */
  summary: ${toJson(timeline.summary)},

  ${eventsSection}

  // =============================================
  // 階層構造（オプショナル）
  // =============================================

  /** 親タイムラインのID */
  parentTimeline: ${toJson(timeline.parentTimeline ?? "")},

  /** 子タイムラインのIDリスト */
  childTimelines: ${indent(toJson(timeline.childTimelines ?? []), 2)},

  // =============================================
  // 関連情報（オプショナル）
  // =============================================

  /** 関連するキャラクターのID（scope: "character" の場合に使用） */
  relatedCharacter: ${toJson(timeline.relatedCharacter ?? "")},

  /** 表示名のバリエーション */
  displayNames: ${indent(toJson(timeline.displayNames ?? []), 2)},

  // =============================================
  // 表示オプション（オプショナル）
  // =============================================

  /** 表示オプション */
  displayOptions: {
    /** 関連を表示するか */
    showRelations: ${toJson(displayOptions.showRelations)},
    /** カラースキーム */
    colorScheme: ${toJson(displayOptions.colorScheme)},
    /** 折りたたみ状態 */
    collapsed: ${toJson(displayOptions.collapsed)},
  },

  // =============================================
  // 詳細情報（オプショナル）
  // =============================================

  /** 詳細情報 - 各フィールドは文字列 or { file: "path/to/file.md" } */
  details: {
    /** 背景説明 */
    background: ${toJson(details.background)},
    /** メモ */
    notes: ${toJson(details.notes)},
  },
};
`;
  }
}
