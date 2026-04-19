/**
 * Element Intersection Command
 *
 * storyteller element intersection コマンドの実装
 * 既存のサブプロットファイルに交差（Intersection）を追加する
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  IntersectionInfluenceDirection,
  IntersectionInfluenceLevel,
  PlotIntersection,
} from "@storyteller/types/v2/subplot.ts";
import {
  parseSubplotFromFile,
} from "@storyteller/application/subplot/subplot_file_parser.ts";
import {
  generateSubplotFile,
} from "@storyteller/application/subplot/subplot_file_generator.ts";

/**
 * ElementIntersectionCommandのオプション
 */
interface ElementIntersectionOptions {
  readonly "source-subplot": string;
  readonly "source-beat": string;
  readonly "target-subplot": string;
  readonly "target-beat": string;
  readonly summary: string;
  readonly "influence-direction": IntersectionInfluenceDirection;
  readonly "influence-level"?: IntersectionInfluenceLevel;
}

/**
 * 有効な影響方向
 */
const validDirections: IntersectionInfluenceDirection[] = [
  "forward",
  "backward",
  "mutual",
];

/**
 * 有効な影響度
 */
const validLevels: IntersectionInfluenceLevel[] = [
  "high",
  "medium",
  "low",
];

/**
 * storyteller element intersection コマンド
 *
 * 既存のサブプロットに交差を追加する（source側にのみ保存）
 */
export class ElementIntersectionCommand extends BaseCliCommand {
  override readonly name = "intersection" as const;
  override readonly path = ["element", "intersection"] as const;

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

      // ソースサブプロットファイルのパス
      const sourceFilePath =
        `${projectRoot}/src/subplots/${parsed["source-subplot"]}.ts`;

      // ターゲットサブプロットファイルのパス
      const targetFilePath =
        `${projectRoot}/src/subplots/${parsed["target-subplot"]}.ts`;

      // ソースサブプロットファイルが存在するか確認
      try {
        await Deno.stat(sourceFilePath);
      } catch {
        return err({
          code: "source_subplot_not_found",
          message: `Source subplot file not found: ${sourceFilePath}`,
        });
      }

      // ターゲットサブプロットファイルが存在するか確認
      try {
        await Deno.stat(targetFilePath);
      } catch {
        return err({
          code: "target_subplot_not_found",
          message: `Target subplot file not found: ${targetFilePath}`,
        });
      }

      // ソースサブプロットファイルを読み込む
      const sourceContent = await Deno.readTextFile(sourceFilePath);
      const sourceSubplot = parseSubplotFromFile(sourceContent);
      if (!sourceSubplot) {
        return err({
          code: "source_subplot_parse_error",
          message: `Failed to parse source subplot from file: ${sourceFilePath}`,
        });
      }

      // ターゲットサブプロットファイルを読み込む
      const targetContent = await Deno.readTextFile(targetFilePath);
      const targetSubplot = parseSubplotFromFile(targetContent);
      if (!targetSubplot) {
        return err({
          code: "target_subplot_parse_error",
          message: `Failed to parse target subplot from file: ${targetFilePath}`,
        });
      }

      // ソースビートの存在確認
      const sourceBeat = sourceSubplot.beats.find(
        (b) => b.id === parsed["source-beat"],
      );
      if (!sourceBeat) {
        return err({
          code: "source_beat_not_found",
          message:
            `Source beat "${parsed["source-beat"]}" not found in subplot "${parsed["source-subplot"]}". Available beats: ${
              sourceSubplot.beats.map((b) => b.id).join(", ")
            }`,
        });
      }

      // ターゲットビートの存在確認
      const targetBeat = targetSubplot.beats.find(
        (b) => b.id === parsed["target-beat"],
      );
      if (!targetBeat) {
        return err({
          code: "target_beat_not_found",
          message:
            `Target beat "${parsed["target-beat"]}" not found in subplot "${parsed["target-subplot"]}". Available beats: ${
              targetSubplot.beats.map((b) => b.id).join(", ")
            }`,
        });
      }

      // Intersection IDを生成: intersection_{source}_{target}_{count+1}
      const existingIntersections = sourceSubplot.intersections ?? [];
      const intersectionId =
        `intersection_${parsed["source-subplot"]}_${parsed["target-subplot"]}_${existingIntersections.length + 1}`;

      // 新しい交差を作成
      const newIntersection: PlotIntersection = {
        id: intersectionId,
        sourceSubplotId: parsed["source-subplot"],
        sourceBeatId: parsed["source-beat"],
        targetSubplotId: parsed["target-subplot"],
        targetBeatId: parsed["target-beat"],
        summary: parsed.summary,
        influenceDirection: parsed["influence-direction"],
        ...(parsed["influence-level"] && {
          influenceLevel: parsed["influence-level"],
        }),
      };

      // 交差をソースサブプロットに追加
      // Why: Intersection stored ONLY on source subplot (unidirectional) per spec
      sourceSubplot.intersections = [
        ...existingIntersections,
        newIntersection,
      ];

      // 更新されたファイルを生成
      const updatedContent = generateSubplotFile(sourceSubplot);

      // ファイルを書き込む
      await Deno.writeTextFile(sourceFilePath, updatedContent);

      context.logger.info("Intersection added to subplot", {
        sourceSubplotId: parsed["source-subplot"],
        targetSubplotId: parsed["target-subplot"],
        intersectionId,
      });

      return ok({
        sourceSubplotId: parsed["source-subplot"],
        targetSubplotId: parsed["target-subplot"],
        intersectionId,
        filePath: sourceFilePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "intersection_creation_failed",
        message,
      });
    }
  }

  /**
   * オプションをパースする
   */
  private parseOptions(
    context: CommandContext,
  ): ElementIntersectionOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args["source-subplot"] ||
      typeof args["source-subplot"] !== "string" ||
      args["source-subplot"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Source subplot ID is required (--source-subplot)",
      };
    }

    if (
      !args["source-beat"] ||
      typeof args["source-beat"] !== "string" ||
      args["source-beat"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Source beat ID is required (--source-beat)",
      };
    }

    if (
      !args["target-subplot"] ||
      typeof args["target-subplot"] !== "string" ||
      args["target-subplot"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Target subplot ID is required (--target-subplot)",
      };
    }

    if (
      !args["target-beat"] ||
      typeof args["target-beat"] !== "string" ||
      args["target-beat"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Target beat ID is required (--target-beat)",
      };
    }

    if (
      !args.summary || typeof args.summary !== "string" ||
      args.summary.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Intersection summary is required (--summary)",
      };
    }

    // influence-directionの検証（デフォルト: forward）
    const influenceDirection = typeof args["influence-direction"] === "string"
      ? args["influence-direction"]
      : "forward";
    if (!validDirections.includes(influenceDirection as IntersectionInfluenceDirection)) {
      return {
        code: "invalid_arguments",
        message:
          `Invalid influence direction: ${influenceDirection}. Must be one of: ${
            validDirections.join(", ")
          }`,
      };
    }

    // influence-levelの検証
    if (
      args["influence-level"] &&
      typeof args["influence-level"] === "string" &&
      !validLevels.includes(args["influence-level"] as IntersectionInfluenceLevel)
    ) {
      return {
        code: "invalid_arguments",
        message: `Invalid influence level: ${args["influence-level"]}. Must be one of: ${
          validLevels.join(", ")
        }`,
      };
    }

    return {
      "source-subplot": args["source-subplot"],
      "source-beat": args["source-beat"],
      "target-subplot": args["target-subplot"],
      "target-beat": args["target-beat"],
      summary: args.summary,
      "influence-direction": influenceDirection as IntersectionInfluenceDirection,
      "influence-level": typeof args["influence-level"] === "string"
        ? args["influence-level"] as IntersectionInfluenceLevel
        : undefined,
    };
  }
}
