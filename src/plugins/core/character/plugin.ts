/**
 * CharacterPlugin
 *
 * Character要素の作成、検証、スキーマエクスポートを担当するプラグイン
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
import type { Character } from "../../../type/v2/character.ts";
import { validateCharacter } from "./validator.ts";
import { join } from "@std/path";

export class CharacterPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.character",
    version: "1.0.0",
    name: "Character Element Plugin",
    description: "Manages Character element creation and validation",
  };

  readonly elementType = "character";

  /**
   * Character要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからCharacterオブジェクトを構築
      const character = options as Partial<Character>;

      // 必須フィールドの検証
      if (
        !character.id || !character.name || !character.role ||
        !character.summary
      ) {
        return err(
          new Error("Missing required fields: id, name, role, summary"),
        );
      }

      // デフォルト値の設定
      const fullCharacter: Character = {
        id: character.id,
        name: character.name,
        role: character.role,
        traits: character.traits ?? [],
        relationships: character.relationships ?? {},
        appearingChapters: character.appearingChapters ?? [],
        summary: character.summary,
        ...(character.displayNames && { displayNames: character.displayNames }),
        ...(character.aliases && { aliases: character.aliases }),
        ...(character.pronouns && { pronouns: character.pronouns }),
        ...(character.details && { details: character.details }),
        ...(character.detectionHints &&
          { detectionHints: character.detectionHints }),
      };

      // 検証
      const validationResult = validateCharacter(fullCharacter);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullCharacter);
      const filePath = `src/characters/${character.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Character要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateCharacter(element);
  }

  /**
   * Character型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "character",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Character name" },
        role: {
          type: "CharacterRole",
          description:
            "Character role (protagonist, antagonist, supporting, guest)",
        },
        traits: { type: "string[]", description: "Character traits" },
        relationships: {
          type: "Record<string, RelationType>",
          description: "Relationships with other characters",
        },
        appearingChapters: {
          type: "string[]",
          description: "Chapters where character appears",
        },
        summary: { type: "string", description: "Short summary" },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        aliases: {
          type: "string[]",
          description: "Aliases and nicknames",
          optional: true,
        },
        pronouns: {
          type: "string[]",
          description: "Pronouns for LSP",
          optional: true,
        },
        details: {
          type: "CharacterDetails",
          description: "Detailed information",
          optional: true,
        },
        detectionHints: {
          type: "DetectionHints",
          description: "LSP detection hints",
          optional: true,
        },
      },
      required: [
        "id",
        "name",
        "role",
        "traits",
        "relationships",
        "appearingChapters",
        "summary",
      ],
    };
  }

  /**
   * Character要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "characters", `${elementId}.ts`);
  }

  /**
   * Character詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "characters", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   */
  private generateTypeScriptFile(character: Character): string {
    // JSONを整形して出力
    const characterJson = JSON.stringify(character, null, 2);

    return `import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * ${character.name}
 * ${character.summary}
 */
export const ${character.id}: Character = ${characterJson};
`;
  }
}
