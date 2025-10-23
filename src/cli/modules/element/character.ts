/**
 * Element Character Command
 *
 * storyteller element character コマンドの実装
 */

import { ok, err } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import type { CharacterRole } from "../../../type/v2/character.ts";
import { ElementService } from "../../../application/element_service.ts";
import { createPluginRegistry } from "../../../core/plugin_system.ts";
import { CharacterPlugin } from "../../../plugins/core/character/plugin.ts";
import { DetailsPlugin } from "../../../plugins/features/details/plugin.ts";
import type { DetailField } from "../../../plugins/features/details/templates.ts";

/**
 * ElementCharacterCommandのオプション
 */
interface ElementCharacterOptions {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly summary?: string;
  readonly traits?: string;
  readonly "with-details"?: boolean;
  readonly "add-details"?: string;
  readonly "separate-files"?: string;
}

/**
 * storyteller element character コマンド
 *
 * Character要素を作成する
 */
export class ElementCharacterCommand extends BaseCliCommand {
  override readonly name = "character" as const;
  override readonly path = ["element", "character"] as const;

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
      registry.register(new CharacterPlugin());
      registry.register(new DetailsPlugin());

      const service = new ElementService(registry);

      // Character要素の作成
      context.logger.info("Creating character element", { name: parsed.name });

      const options: any = {
        id: parsed.id,
        name: parsed.name,
        role: parsed.role,
        summary: parsed.summary ?? `${parsed.name}の概要（要追加）`,
        traits: parsed.traits ? parsed.traits.split(",").map((t) => t.trim()) : [],
        relationships: {},
        appearingChapters: [],
      };

      // 詳細情報の追加
      if (parsed["with-details"]) {
        // すべての詳細フィールドを追加
        const allFields: DetailField[] = ["appearance", "personality", "backstory", "development"];
        const detailResult = await service.addDetailsToElement("character", options, allFields);

        if (detailResult.ok) {
          Object.assign(options, { details: detailResult.value.details });
        }
      } else if (parsed["add-details"]) {
        // 指定された詳細フィールドのみ追加
        const fields = parsed["add-details"].split(",").map((f) => f.trim()) as DetailField[];
        const detailResult = await service.addDetailsToElement("character", options, fields);

        if (detailResult.ok) {
          Object.assign(options, { details: detailResult.value.details });
        }
      }

      const result = await service.createElement("character", options);

      if (result.ok) {
        context.logger.info("Character element created", {
          filePath: result.value.filePath,
        });

        // --separate-filesオプションが指定されている場合、ファイル分離を実行
        if (parsed["separate-files"]) {
          const config = await context.config.resolve();
          const projectRoot = config.runtime.projectRoot || Deno.cwd();

          const fieldsToSeparate = parsed["separate-files"] === "all"
            ? "all"
            : parsed["separate-files"].split(",").map((f) => f.trim()) as DetailField[];

          const separateResult = await service.separateFilesForElement(
            "character",
            options as any,
            fieldsToSeparate,
            projectRoot,
          );

          if (separateResult.ok) {
            // 生成されたMarkdownファイルを書き込む
            for (const fileInfo of separateResult.value.filesToCreate) {
              const fullPath = `${projectRoot}/${fileInfo.path}`;
              const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

              await Deno.mkdir(dir, { recursive: true });
              await Deno.writeTextFile(fullPath, fileInfo.content);

              context.logger.info("Detail file created", {
                filePath: fileInfo.path,
              });
            }

            // Character要素のファイルを更新（ファイル参照に変更）
            // NOTE: 実際のファイル更新処理はCharacterPluginが担当するべきだが、
            // 簡易実装として、ここで再作成することも可能
          } else {
            context.logger.warn("Failed to separate files", {
              error: separateResult.error.message,
            });
          }
        }

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
  private parseOptions(context: CommandContext): ElementCharacterOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (!args.name || typeof args.name !== "string" || args.name.trim() === "") {
      return {
        code: "invalid_arguments",
        message: "Character name is required (--name)",
      };
    }

    if (!args.role || typeof args.role !== "string") {
      return {
        code: "invalid_arguments",
        message: "Character role is required (--role)",
      };
    }

    // roleの検証
    const validRoles: CharacterRole[] = ["protagonist", "antagonist", "supporting", "guest"];
    if (!validRoles.includes(args.role as CharacterRole)) {
      return {
        code: "invalid_arguments",
        message: `Invalid role: ${args.role}. Must be one of: ${validRoles.join(", ")}`,
      };
    }

    // idのデフォルト値はnameと同じ
    const id = args.id && typeof args.id === "string" ? args.id : args.name;

    return {
      id,
      name: args.name,
      role: args.role,
      summary: typeof args.summary === "string" ? args.summary : undefined,
      traits: typeof args.traits === "string" ? args.traits : undefined,
      "with-details": args["with-details"] === true,
      "add-details": typeof args["add-details"] === "string" ? args["add-details"] : undefined,
      "separate-files": typeof args["separate-files"] === "string" ? args["separate-files"] : undefined,
    };
  }
}
