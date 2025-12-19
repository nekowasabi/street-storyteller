/**
 * ファイル参照整合性バリデータ
 *
 * Character要素のdetailsフィールドのファイル参照が実際に存在するかチェック
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { Result } from "@storyteller/shared/result.ts";
import type {
  Character,
  CharacterDetails,
} from "@storyteller/types/v2/character.ts";
import { join } from "@std/path";

/**
 * 検証エラー
 */
export type ValidationError = {
  /** エラーの種類 */
  type: "file_not_found" | "circular_reference";
  /** 対象のフィールド名 */
  field: string;
  /** ファイルパス */
  filePath: string;
  /** エラーメッセージ */
  message: string;
};

/**
 * 検証結果
 */
export type ValidationResult = {
  /** 検証が成功したか */
  valid: boolean;
  /** エラーのリスト */
  errors: ValidationError[];
};

/**
 * ファイル参照の整合性をチェックするバリデータ
 */
export class FileReferenceValidator {
  /**
   * Character要素のファイル参照を検証する
   *
   * @param character 検証対象のCharacter
   * @param projectRoot プロジェクトルートパス
   * @returns 検証結果
   */
  async validate(
    character: Character,
    projectRoot: string,
  ): Promise<Result<ValidationResult, Error>> {
    try {
      const errors: ValidationError[] = [];

      // detailsが存在しない場合は問題なし
      if (!character.details) {
        return ok({ valid: true, errors: [] });
      }

      const details = character.details;

      // 各フィールドをチェック
      const fieldsToCheck: Array<keyof CharacterDetails> = [
        "description",
        "appearance",
        "personality",
        "backstory",
        "relationships_detail",
        "goals",
      ];

      for (const field of fieldsToCheck) {
        const value = details[field];

        // ファイル参照の場合のみチェック
        if (typeof value === "object" && value !== null && "file" in value) {
          const filePath = value.file;
          const absolutePath = join(projectRoot, filePath);

          // ファイルの存在確認
          try {
            const stat = await Deno.stat(absolutePath);
            if (!stat.isFile) {
              errors.push({
                type: "file_not_found",
                field,
                filePath,
                message: `Referenced path is not a file: ${filePath}`,
              });
            }
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              errors.push({
                type: "file_not_found",
                field,
                filePath,
                message: `Referenced file not found: ${filePath}`,
              });
            } else {
              throw error;
            }
          }
        }
      }

      // development.arc_notesもチェック
      if (details.development?.arc_notes) {
        const arcNotes = details.development.arc_notes;
        if (typeof arcNotes === "object" && "file" in arcNotes) {
          const filePath = arcNotes.file;
          const absolutePath = join(projectRoot, filePath);

          try {
            const stat = await Deno.stat(absolutePath);
            if (!stat.isFile) {
              errors.push({
                type: "file_not_found",
                field: "development.arc_notes",
                filePath,
                message: `Referenced path is not a file: ${filePath}`,
              });
            }
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              errors.push({
                type: "file_not_found",
                field: "development.arc_notes",
                filePath,
                message: `Referenced file not found: ${filePath}`,
              });
            } else {
              throw error;
            }
          }
        }
      }

      return ok({
        valid: errors.length === 0,
        errors,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 複数のCharacterをまとめて検証する
   *
   * @param characters 検証対象のCharacterリスト
   * @param projectRoot プロジェクトルートパス
   * @returns 各Characterの検証結果のマップ
   */
  async validateMultiple(
    characters: Character[],
    projectRoot: string,
  ): Promise<Result<Map<string, ValidationResult>, Error>> {
    try {
      const results = new Map<string, ValidationResult>();

      for (const character of characters) {
        const result = await this.validate(character, projectRoot);

        if (result.ok) {
          results.set(character.id, result.value);
        } else {
          return err(result.error);
        }
      }

      return ok(results);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
