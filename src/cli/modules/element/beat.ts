/**
 * Element Beat Command
 *
 * storyteller element beat コマンドの実装
 * 既存のサブプロットファイルにビートを追加する
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  BeatStructurePosition,
  PlotBeat,
} from "@storyteller/types/v2/subplot.ts";
import {
  parseSubplotWithMutableBeats,
} from "@storyteller/application/subplot/subplot_file_parser.ts";
import {
  generateSubplotFile,
} from "@storyteller/application/subplot/subplot_file_generator.ts";

/**
 * ElementBeatCommandのオプション
 */
interface ElementBeatOptions {
  readonly subplot: string;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly chapter: string;
  readonly "structure-position": BeatStructurePosition;
  readonly characters?: string;
  readonly settings?: string;
  readonly "precondition-beats"?: string;
  readonly "timeline-event"?: string;
}

/**
 * 有効な構造位置
 */
const validPositions: BeatStructurePosition[] = [
  "setup",
  "rising",
  "climax",
  "falling",
  "resolution",
];

/**
 * storyteller element beat コマンド
 *
 * 既存のサブプロットにビートを追加する
 */
export class ElementBeatCommand extends BaseCliCommand {
  override readonly name = "beat" as const;
  override readonly path = ["element", "beat"] as const;

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

      // サブプロットファイルのパス
      const subplotFilePath =
        `${projectRoot}/src/subplots/${parsed.subplot}.ts`;

      // サブプロットファイルが存在するか確認
      try {
        await Deno.stat(subplotFilePath);
      } catch {
        return err({
          code: "subplot_not_found",
          message: `Subplot file not found: ${subplotFilePath}`,
        });
      }

      // サブプロットファイルを読み込む
      const fileContent = await Deno.readTextFile(subplotFilePath);

      // 既存のSubplotオブジェクトを抽出
      const { subplot, beats } = parseSubplotWithMutableBeats(fileContent);
      if (!subplot) {
        return err({
          code: "subplot_parse_error",
          message: `Failed to parse subplot from file: ${subplotFilePath}`,
        });
      }

      // precondition-beatsの存在確認
      if (parsed["precondition-beats"]) {
        const preconditionIds = parsed["precondition-beats"].split(",").map(
          (b) => b.trim(),
        );
        const existingBeatIds = new Set(beats.map((b) => b.id));
        const missing = preconditionIds.filter((id) =>
          !existingBeatIds.has(id)
        );
        if (missing.length > 0) {
          return err({
            code: "precondition_beat_not_found",
            message: `Precondition beat(s) not found: ${missing.join(", ")}`,
          });
        }
      }

      // 新しいビートを作成
      const newBeat: PlotBeat = {
        id: parsed.id,
        title: parsed.title,
        summary: parsed.summary,
        structurePosition: parsed["structure-position"],
        chapter: parsed.chapter,
        ...(parsed.characters && {
          characters: parsed.characters.split(",").map((c) => c.trim()),
        }),
        ...(parsed.settings && {
          settings: parsed.settings.split(",").map((s) => s.trim()),
        }),
        ...(parsed["timeline-event"] && {
          timelineEventId: parsed["timeline-event"],
        }),
        ...(parsed["precondition-beats"] && {
          preconditionBeatIds: parsed["precondition-beats"].split(",").map(
            (b) => b.trim(),
          ),
        }),
      };

      // ビートを追加
      beats.push(newBeat);

      // サブプロットを更新
      subplot.beats = beats;

      // 更新されたファイルを生成
      const updatedContent = generateSubplotFile(subplot);

      // ファイルを書き込む
      await Deno.writeTextFile(subplotFilePath, updatedContent);

      context.logger.info("Beat added to subplot", {
        subplotId: parsed.subplot,
        beatId: parsed.id,
        beatTitle: parsed.title,
      });

      return ok({
        subplotId: parsed.subplot,
        beatId: parsed.id,
        filePath: subplotFilePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "beat_creation_failed",
        message,
      });
    }
  }

  /**
   * オプションをパースする
   */
  private parseOptions(
    context: CommandContext,
  ): ElementBeatOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.subplot || typeof args.subplot !== "string" ||
      args.subplot.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Subplot ID is required (--subplot)",
      };
    }

    if (
      !args.title || typeof args.title !== "string" || args.title.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Beat title is required (--title)",
      };
    }

    if (
      !args.summary || typeof args.summary !== "string" ||
      args.summary.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Beat summary is required (--summary)",
      };
    }

    if (
      !args.chapter || typeof args.chapter !== "string" ||
      args.chapter.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Chapter ID is required (--chapter)",
      };
    }

    // Why: structure-position defaults to "setup" when omitted, allowing simpler beat creation
    const structurePosition =
      (typeof args["structure-position"] === "string"
        ? args["structure-position"]
        : "setup") as BeatStructurePosition;

    // structure-positionの検証
    if (
      !validPositions.includes(
        structurePosition,
      )
    ) {
      return {
        code: "invalid_arguments",
        message:
          `Invalid --structure-position: ${structurePosition}. Must be one of: ${
            validPositions.join(", ")
          }`,
      };
    }

    // idのデフォルト値: {subplot}_beat_{count+1}
    // Why: beat count is determined at runtime, so default id is set from title
    const id = args.id && typeof args.id === "string"
      ? args.id
      : this.generateIdFromTitle(args.title);

    return {
      subplot: args.subplot,
      id,
      title: args.title,
      summary: args.summary,
      chapter: args.chapter,
      "structure-position": structurePosition,
      characters: typeof args.characters === "string"
        ? args.characters
        : undefined,
      settings: typeof args.settings === "string" ? args.settings : undefined,
      "precondition-beats": typeof args["precondition-beats"] === "string"
        ? args["precondition-beats"]
        : undefined,
      "timeline-event": typeof args["timeline-event"] === "string"
        ? args["timeline-event"]
        : undefined,
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
