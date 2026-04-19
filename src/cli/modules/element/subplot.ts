/**
 * Element Subplot Command
 *
 * storyteller element subplot コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type { SubplotType } from "@storyteller/types/v2/subplot.ts";
import { ElementService } from "@storyteller/application/element_service.ts";
import { createPluginRegistry } from "@storyteller/core/plugin_system.ts";
import { SubplotPlugin } from "@storyteller/plugins/core/subplot/plugin.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * ElementSubplotCommandのオプション
 */
interface ElementSubplotOptions {
  readonly id: string;
  readonly name: string;
  readonly type: SubplotType;
  readonly summary: string;
  readonly importance?: string;
  readonly "parent-subplot"?: string;
  readonly "focus-characters"?: string;
  readonly force?: boolean;
}

/**
 * 有効なサブプロットタイプ
 */
const validTypes: SubplotType[] = [
  "main",
  "subplot",
  "parallel",
  "background",
];

/**
 * storyteller element subplot コマンド
 *
 * Subplot要素を作成する
 */
export class ElementSubplotCommand extends BaseCliCommand {
  override readonly name = "subplot" as const;
  override readonly path = ["element", "subplot"] as const;

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
      registry.register(new SubplotPlugin());

      const service = new ElementService(registry);

      // focus-characters のパース (例: "hero:primary,heroine:secondary")
      const focusCharacters: Record<string, string> = {};
      if (parsed["focus-characters"]) {
        parsed["focus-characters"].split(",").forEach((pair) => {
          const [charId, weight] = pair.trim().split(":");
          if (charId && weight) {
            focusCharacters[charId.trim()] = weight.trim();
          }
        });
      }

      // Subplot要素の作成
      context.logger.info("Creating subplot element", {
        name: parsed.name,
      });

      const subplot: Subplot = {
        id: parsed.id,
        name: parsed.name,
        type: parsed.type,
        status: "active",
        summary: parsed.summary,
        beats: [],
        ...(parsed.importance && {
          importance: parsed.importance as "major" | "minor",
        }),
        ...(parsed["parent-subplot"] && {
          parentSubplotId: parsed["parent-subplot"],
        }),
        ...(Object.keys(focusCharacters).length > 0 && {
          focusCharacters: focusCharacters as Record<
            string,
            "primary" | "secondary"
          >,
        }),
      };

      const result = await service.createElement(
        "subplot",
        subplot,
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

        context.logger.info("Subplot element created", {
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
  ): ElementSubplotOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.name || typeof args.name !== "string" || args.name.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Subplot name is required (--name)",
      };
    }

    if (!args.type || typeof args.type !== "string") {
      return {
        code: "invalid_arguments",
        message: "Subplot type is required (--type)",
      };
    }

    // typeの検証
    if (!validTypes.includes(args.type as SubplotType)) {
      return {
        code: "invalid_arguments",
        message: `Invalid type: ${args.type}. Must be one of: ${
          validTypes.join(", ")
        }`,
      };
    }

    if (
      !args.summary || typeof args.summary !== "string" ||
      args.summary.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Subplot summary is required (--summary)",
      };
    }

    // importanceの検証
    const validImportances = ["major", "minor"];
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
      type: args.type as SubplotType,
      summary: args.summary,
      importance: typeof args.importance === "string"
        ? args.importance
        : undefined,
      "parent-subplot": typeof args["parent-subplot"] === "string"
        ? args["parent-subplot"]
        : undefined,
      "focus-characters": typeof args["focus-characters"] === "string"
        ? args["focus-characters"]
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
