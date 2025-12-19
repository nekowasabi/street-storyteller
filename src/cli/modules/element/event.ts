/**
 * Element Event Command
 *
 * storyteller element event コマンドの実装
 * 既存のタイムラインファイルにイベントを追加する
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  EventCategory,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";
import {
  generateTimelineFile,
  parseTimelineFromFileWithMutableEvents,
} from "@storyteller/application/timeline/timeline_file_parser.ts";

/**
 * ElementEventCommandのオプション
 */
interface ElementEventOptions {
  readonly timeline: string;
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly order: number;
  readonly summary: string;
  readonly characters?: string;
  readonly settings?: string;
  readonly chapters?: string;
  readonly "caused-by"?: string;
  readonly causes?: string;
  readonly importance?: string;
  readonly force?: boolean;
}

/**
 * 有効なイベントカテゴリ
 */
const validCategories: EventCategory[] = [
  "plot_point",
  "character_event",
  "world_event",
  "backstory",
  "foreshadow",
  "climax",
  "resolution",
];

/**
 * storyteller element event コマンド
 *
 * 既存のタイムラインにイベントを追加する
 */
export class ElementEventCommand extends BaseCliCommand {
  override readonly name = "event" as const;
  override readonly path = ["element", "event"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const parsed = this.parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    try {
      // プロジェクトルートを取得
      const config = await context.config.resolve();
      const projectRoot = (context.args?.projectRoot as string) ||
        config.runtime.projectRoot || Deno.cwd();

      // タイムラインファイルのパス
      const timelineFilePath =
        `${projectRoot}/src/timelines/${parsed.timeline}.ts`;

      // タイムラインファイルが存在するか確認
      try {
        await Deno.stat(timelineFilePath);
      } catch {
        return err({
          code: "timeline_not_found",
          message: `Timeline file not found: ${timelineFilePath}`,
        });
      }

      // タイムラインファイルを読み込む
      const fileContent = await Deno.readTextFile(timelineFilePath);

      // 既存のTimelineオブジェクトを抽出（コメント付きフォーマット対応）
      const timeline = parseTimelineFromFileWithMutableEvents(
        fileContent,
        parsed.timeline,
      );
      if (!timeline) {
        return err({
          code: "timeline_parse_error",
          message: `Failed to parse timeline from file: ${timelineFilePath}`,
        });
      }

      // 新しいイベントを作成
      const newEvent: TimelineEvent = {
        id: parsed.id,
        title: parsed.title,
        category: parsed.category as EventCategory,
        time: { order: parsed.order },
        summary: parsed.summary,
        characters: parsed.characters
          ? parsed.characters.split(",").map((c) => c.trim())
          : [],
        settings: parsed.settings
          ? parsed.settings.split(",").map((s) => s.trim())
          : [],
        chapters: parsed.chapters
          ? parsed.chapters.split(",").map((c) => c.trim())
          : [],
        ...(parsed["caused-by"] && {
          causedBy: parsed["caused-by"].split(",").map((c) => c.trim()),
        }),
        ...(parsed.causes && {
          causes: parsed.causes.split(",").map((c) => c.trim()),
        }),
      };

      // イベントを追加
      timeline.events.push(newEvent);

      // イベントをorderでソート
      timeline.events.sort((a, b) => a.time.order - b.time.order);

      // 更新されたファイルを生成
      const updatedContent = generateTimelineFile(timeline);

      // ファイルを書き込む
      await Deno.writeTextFile(timelineFilePath, updatedContent);

      context.logger.info("Event added to timeline", {
        timelineId: parsed.timeline,
        eventId: parsed.id,
        eventTitle: parsed.title,
      });

      return ok({
        timelineId: parsed.timeline,
        eventId: parsed.id,
        filePath: timelineFilePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "event_creation_failed",
        message,
      });
    }
  }

  /**
   * オプションをパースする
   */
  private parseOptions(
    context: CommandContext,
  ): ElementEventOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.timeline || typeof args.timeline !== "string" ||
      args.timeline.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Timeline ID is required (--timeline)",
      };
    }

    if (
      !args.title || typeof args.title !== "string" || args.title.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Event title is required (--title)",
      };
    }

    if (!args.category || typeof args.category !== "string") {
      return {
        code: "invalid_arguments",
        message: "Event category is required (--category)",
      };
    }

    // categoryの検証
    if (!validCategories.includes(args.category as EventCategory)) {
      return {
        code: "invalid_arguments",
        message: `Invalid category: ${args.category}. Must be one of: ${
          validCategories.join(", ")
        }`,
      };
    }

    // orderの検証（文字列から数値に変換）
    const orderRaw = typeof args.order === "string"
      ? parseInt(args.order, 10)
      : args.order;
    if (
      orderRaw === undefined || typeof orderRaw !== "number" || isNaN(orderRaw)
    ) {
      return {
        code: "invalid_arguments",
        message: "Event order is required (--order)",
      };
    }
    const orderValue: number = orderRaw;

    // summaryのデフォルト値
    const summary = typeof args.summary === "string"
      ? args.summary
      : `${args.title}の概要（要追加）`;

    // idのデフォルト値はtitleから生成
    const id = args.id && typeof args.id === "string"
      ? args.id
      : this.generateIdFromTitle(args.title);

    return {
      timeline: args.timeline,
      id,
      title: args.title,
      category: args.category,
      order: orderValue,
      summary,
      characters: typeof args.characters === "string"
        ? args.characters
        : undefined,
      settings: typeof args.settings === "string" ? args.settings : undefined,
      chapters: typeof args.chapters === "string" ? args.chapters : undefined,
      "caused-by": typeof args["caused-by"] === "string"
        ? args["caused-by"]
        : undefined,
      causes: typeof args.causes === "string" ? args.causes : undefined,
      importance: typeof args.importance === "string"
        ? args.importance
        : undefined,
      force: args.force === true,
    };
  }

  /**
   * タイトルからIDを生成する
   */
  private generateIdFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "_")
      .replace(/^_|_$/g, "");
  }
}
