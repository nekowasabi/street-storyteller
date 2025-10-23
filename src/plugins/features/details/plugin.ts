/**
 * DetailsPlugin
 *
 * 既存の要素に詳細情報（details）を段階的に追加する機能プラグイン
 */

import { ok, err } from "../../../shared/result.ts";
import type { Result } from "../../../shared/result.ts";
import type {
  FeaturePlugin,
  PluginMetadata,
} from "../../../core/plugin_system.ts";
import type { Character, CharacterDetails, CharacterDevelopment } from "../../../type/v2/character.ts";
import { getTemplate, getAvailableFields, isValidField, type DetailField } from "./templates.ts";

export class DetailsPlugin implements FeaturePlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.feature.details",
    version: "1.0.0",
    name: "Details Feature Plugin",
    description: "Adds detail skeleton to existing elements",
  };

  readonly featureId = "details";

  /**
   * Character要素に詳細情報を追加する
   *
   * @param character 対象のCharacter要素
   * @param fields 追加する詳細フィールドのリスト
   * @returns 詳細情報が追加されたCharacter要素
   */
  async addDetails(
    character: Character,
    fields: DetailField[],
  ): Promise<Result<Character, Error>> {
    try {
      // 無効なフィールド名をチェック
      const invalidFields = fields.filter((f) => !isValidField(f));
      if (invalidFields.length > 0) {
        return err(new Error(`Invalid field names: ${invalidFields.join(", ")}`));
      }

      // 既存のdetailsを取得（なければ空オブジェクト）
      const currentDetails: CharacterDetails = character.details ?? {};

      // 新しい詳細フィールドを追加
      const newDetails: CharacterDetails = { ...currentDetails };

      for (const field of fields) {
        // 既存のフィールドは上書きしない
        if (field in newDetails && newDetails[field as keyof CharacterDetails] !== undefined) {
          continue;
        }

        const template = getTemplate(field);
        if (field === "development") {
          newDetails.development = template as CharacterDevelopment;
        } else if (field === "appearance") {
          newDetails.appearance = template as string;
        } else if (field === "personality") {
          newDetails.personality = template as string;
        } else if (field === "backstory") {
          newDetails.backstory = template as string;
        } else if (field === "relationships_detail") {
          newDetails.relationships_detail = template as string;
        } else if (field === "goals") {
          newDetails.goals = template as string;
        }
      }

      // 新しいCharacterオブジェクトを返す
      const updatedCharacter: Character = {
        ...character,
        details: newDetails,
      };

      return ok(updatedCharacter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 詳細フィールドのテンプレートを取得
   * @param field フィールド名
   * @returns テンプレート文字列またはオブジェクト
   */
  getTemplate(field: string): string | CharacterDevelopment | null {
    if (!isValidField(field)) {
      return null;
    }
    return getTemplate(field);
  }

  /**
   * 利用可能な詳細フィールド一覧を取得
   * @returns フィールド名の配列
   */
  getAvailableFields(): DetailField[] {
    return getAvailableFields();
  }
}
