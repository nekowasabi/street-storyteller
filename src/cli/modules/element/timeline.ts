/**
 * Element Timeline Command
 *
 * storyteller element timeline コマンドの実装
 */

import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import type { TimelineScope } from "../../../type/v2/timeline.ts";
import { ElementService } from "../../../application/element_service.ts";
import { createPluginRegistry } from "../../../core/plugin_system.ts";
import { TimelinePlugin } from "../../../plugins/core/timeline/plugin.ts";
import type { Timeline } from "../../../type/v2/timeline.ts";

/**
 * ElementTimelineCommandのオプション
 */
interface ElementTimelineOptions {
  readonly id: string;
  readonly name: string;
  readonly scope: string;
  readonly summary?: string;
  readonly "parent-timeline"?: string;
  readonly "related-character"?: string;
  readonly displayNames?: string;
  readonly force?: boolean;
}

/**
 * storyteller element timeline コマンド
 *
 * Timeline要素を作成する
 */
export class ElementTimelineCommand extends BaseCliCommand {
  override readonly name = "timeline" as const;
  override readonly path = ["element", "timeline"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const parsed = this.parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    try {
      // プラグインレジストリの初期化
      const registry = createPluginRegistry();
      registry.register(new TimelinePlugin());

      const service = new ElementService(registry);

      // Timeline要素の作成
      context.logger.info("Creating timeline element", { name: parsed.name });

      const timeline: Timeline = {
        id: parsed.id,
        name: parsed.name,
        scope: parsed.scope as TimelineScope,
        summary: parsed.summary ?? `${parsed.name}の概要（要追加）`,
        events: [],
        ...(parsed["parent-timeline"] && { parentTimeline: parsed["parent-timeline"] }),
        ...(parsed["related-character"] && { relatedCharacter: parsed["related-character"] }),
        ...(parsed.displayNames && {
          displayNames: parsed.displayNames.split(",").map((n) => n.trim()),
        }),
      };

      const result = await service.createElement("timeline", timeline);

      if (result.ok) {
        // プロジェクトルートを取得
        const config = await context.config.resolve();
        const projectRoot = (context.args?.projectRoot as string) ||
          config.runtime.projectRoot || Deno.cwd();

        // ファイルを実際に作成
        const fullPath = `${projectRoot}/${result.value.filePath}`;
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(fullPath, result.value.content);

        context.logger.info("Timeline element created", {
          filePath: result.value.filePath,
        });

        return ok(result.value);
      } else {
        return err({
          code: "element_creation_failed",
          message: result.error.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "element_creation_failed",
        message,
      });
    }
  }

  /**
   * オプションをパースする
   */
  private parseOptions(
    context: CommandContext,
  ): ElementTimelineOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.name || typeof args.name !== "string" || args.name.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Timeline name is required (--name)",
      };
    }

    if (!args.scope || typeof args.scope !== "string") {
      return {
        code: "invalid_arguments",
        message: "Timeline scope is required (--scope)",
      };
    }

    // scopeの検証
    const validScopes: TimelineScope[] = [
      "story",
      "world",
      "character",
      "arc",
    ];
    if (!validScopes.includes(args.scope as TimelineScope)) {
      return {
        code: "invalid_arguments",
        message: `Invalid scope: ${args.scope}. Must be one of: ${
          validScopes.join(", ")
        }`,
      };
    }

    // idのデフォルト値はnameから生成
    const id = args.id && typeof args.id === "string"
      ? args.id
      : this.generateIdFromName(args.name);

    return {
      id,
      name: args.name,
      scope: args.scope,
      summary: typeof args.summary === "string" ? args.summary : undefined,
      "parent-timeline": typeof args["parent-timeline"] === "string"
        ? args["parent-timeline"]
        : undefined,
      "related-character": typeof args["related-character"] === "string"
        ? args["related-character"]
        : undefined,
      displayNames: typeof args.displayNames === "string"
        ? args.displayNames
        : undefined,
      force: args.force === true,
    };
  }

  /**
   * 名前からIDを生成する
   */
  private generateIdFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "_")
      .replace(/^_|_$/g, "");
  }
}
