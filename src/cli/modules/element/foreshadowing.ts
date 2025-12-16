/**
 * Element Foreshadowing Command
 *
 * storyteller element foreshadowing コマンドの実装
 */

import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import type { ForeshadowingType } from "../../../type/v2/foreshadowing.ts";
import { ElementService } from "../../../application/element_service.ts";
import { createPluginRegistry } from "../../../core/plugin_system.ts";
import { ForeshadowingPlugin } from "../../../plugins/core/foreshadowing/plugin.ts";
import type { Foreshadowing } from "../../../type/v2/foreshadowing.ts";

/**
 * ElementForeshadowingCommandのオプション
 */
interface ElementForeshadowingOptions {
  readonly id: string;
  readonly name: string;
  readonly type: ForeshadowingType;
  readonly summary?: string;
  readonly "planting-chapter": string;
  readonly "planting-description": string;
  readonly "planting-excerpt"?: string;
  readonly importance?: string;
  readonly "planned-resolution-chapter"?: string;
  readonly characters?: string;
  readonly settings?: string;
  readonly "display-names"?: string;
  readonly force?: boolean;
}

/**
 * 有効なタイプ
 */
const validTypes: ForeshadowingType[] = [
  "hint",
  "prophecy",
  "mystery",
  "symbol",
  "chekhov",
  "red_herring",
];

/**
 * storyteller element foreshadowing コマンド
 *
 * Foreshadowing要素を作成する
 */
export class ElementForeshadowingCommand extends BaseCliCommand {
  override readonly name = "foreshadowing" as const;
  override readonly path = ["element", "foreshadowing"] as const;

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
      registry.register(new ForeshadowingPlugin());

      const service = new ElementService(registry);

      // Foreshadowing要素の作成
      context.logger.info("Creating foreshadowing element", {
        name: parsed.name,
      });

      const foreshadowing: Foreshadowing = {
        id: parsed.id,
        name: parsed.name,
        type: parsed.type,
        summary: parsed.summary ?? `${parsed.name}の概要（要追加）`,
        planting: {
          chapter: parsed["planting-chapter"],
          description: parsed["planting-description"],
          ...(parsed["planting-excerpt"] &&
            { excerpt: parsed["planting-excerpt"] }),
        },
        status: "planted",
        ...(parsed.importance && {
          importance: parsed.importance as "major" | "minor" | "subtle",
        }),
        ...(parsed["planned-resolution-chapter"] && {
          plannedResolutionChapter: parsed["planned-resolution-chapter"],
        }),
        ...((parsed.characters || parsed.settings) && {
          relations: {
            characters: parsed.characters
              ? parsed.characters.split(",").map((c) => c.trim())
              : [],
            settings: parsed.settings
              ? parsed.settings.split(",").map((s) => s.trim())
              : [],
          },
        }),
        ...(parsed["display-names"] && {
          displayNames: parsed["display-names"].split(",").map((n) => n.trim()),
        }),
      };

      const result = await service.createElement(
        "foreshadowing",
        foreshadowing,
      );

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

        context.logger.info("Foreshadowing element created", {
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
  ): ElementForeshadowingOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.name || typeof args.name !== "string" || args.name.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Foreshadowing name is required (--name)",
      };
    }

    if (!args.type || typeof args.type !== "string") {
      return {
        code: "invalid_arguments",
        message: "Foreshadowing type is required (--type)",
      };
    }

    // typeの検証
    if (!validTypes.includes(args.type as ForeshadowingType)) {
      return {
        code: "invalid_arguments",
        message: `Invalid type: ${args.type}. Must be one of: ${
          validTypes.join(", ")
        }`,
      };
    }

    if (
      !args["planting-chapter"] ||
      typeof args["planting-chapter"] !== "string" ||
      args["planting-chapter"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Planting chapter is required (--planting-chapter)",
      };
    }

    if (
      !args["planting-description"] ||
      typeof args["planting-description"] !== "string" ||
      args["planting-description"].trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Planting description is required (--planting-description)",
      };
    }

    // importanceの検証
    const validImportances = ["major", "minor", "subtle"];
    if (
      args.importance &&
      typeof args.importance === "string" &&
      !validImportances.includes(args.importance)
    ) {
      return {
        code: "invalid_arguments",
        message: `Invalid importance: ${args.importance}. Must be one of: ${
          validImportances.join(", ")
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
      type: args.type as ForeshadowingType,
      summary: typeof args.summary === "string" ? args.summary : undefined,
      "planting-chapter": args["planting-chapter"],
      "planting-description": args["planting-description"],
      "planting-excerpt": typeof args["planting-excerpt"] === "string"
        ? args["planting-excerpt"]
        : undefined,
      importance: typeof args.importance === "string"
        ? args.importance
        : undefined,
      "planned-resolution-chapter":
        typeof args["planned-resolution-chapter"] ===
            "string"
          ? args["planned-resolution-chapter"]
          : undefined,
      characters: typeof args.characters === "string"
        ? args.characters
        : undefined,
      settings: typeof args.settings === "string" ? args.settings : undefined,
      "display-names": typeof args["display-names"] === "string"
        ? args["display-names"]
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
