/**
 * Element Setting Command
 *
 * storyteller element setting コマンドの実装
 */

import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import type { SettingType } from "../../../type/v2/setting.ts";
import { ElementService } from "../../../application/element_service.ts";
import { createPluginRegistry } from "../../../core/plugin_system.ts";
import { SettingPlugin } from "../../../plugins/core/setting/plugin.ts";
import type { Setting } from "../../../type/v2/setting.ts";

/**
 * ElementSettingCommandのオプション
 */
interface ElementSettingOptions {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly summary?: string;
  readonly displayNames?: string;
  readonly relatedSettings?: string;
  readonly force?: boolean;
}

/**
 * storyteller element setting コマンド
 *
 * Setting要素を作成する
 */
export class ElementSettingCommand extends BaseCliCommand {
  override readonly name = "setting" as const;
  override readonly path = ["element", "setting"] as const;

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
      registry.register(new SettingPlugin());

      const service = new ElementService(registry);

      // Setting要素の作成
      context.logger.info("Creating setting element", { name: parsed.name });

      const setting: Setting = {
        id: parsed.id,
        name: parsed.name,
        type: parsed.type as SettingType,
        summary: parsed.summary ?? `${parsed.name}の概要（要追加）`,
        appearingChapters: [],
        ...(parsed.displayNames && {
          displayNames: parsed.displayNames.split(",").map((n) => n.trim()),
        }),
        ...(parsed.relatedSettings && {
          relatedSettings: parsed.relatedSettings.split(",").map((s) =>
            s.trim()
          ),
        }),
      };

      const result = await service.createElement("setting", setting);

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

        context.logger.info("Setting element created", {
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
  ): ElementSettingOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (
      !args.name || typeof args.name !== "string" || args.name.trim() === ""
    ) {
      return {
        code: "invalid_arguments",
        message: "Setting name is required (--name)",
      };
    }

    if (!args.type || typeof args.type !== "string") {
      return {
        code: "invalid_arguments",
        message: "Setting type is required (--type)",
      };
    }

    // typeの検証
    const validTypes: SettingType[] = [
      "location",
      "world",
      "culture",
      "organization",
    ];
    if (!validTypes.includes(args.type as SettingType)) {
      return {
        code: "invalid_arguments",
        message: `Invalid type: ${args.type}. Must be one of: ${
          validTypes.join(", ")
        }`,
      };
    }

    // idのデフォルト値はnameと同じ
    const id = args.id && typeof args.id === "string" ? args.id : args.name;

    return {
      id,
      name: args.name,
      type: args.type,
      summary: typeof args.summary === "string" ? args.summary : undefined,
      displayNames: typeof args.displayNames === "string"
        ? args.displayNames
        : undefined,
      relatedSettings: typeof args.relatedSettings === "string"
        ? args.relatedSettings
        : undefined,
      force: args.force === true,
    };
  }
}
