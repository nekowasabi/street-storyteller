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
import { generateMarkdownContent } from "./markdown.ts";

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
   * @param force 既存の詳細を強制上書きする（デフォルト: false）
   * @returns 詳細情報が追加されたCharacter要素
   */
  async addDetails(
    character: Character,
    fields: DetailField[],
    force = false,
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
        // forceがfalseで既存のフィールドがある場合は上書きしない
        if (!force && field in newDetails && newDetails[field as keyof CharacterDetails] !== undefined) {
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

  /**
   * インラインの詳細情報をMarkdownファイルに分離する
   *
   * @param character 対象のCharacter要素
   * @param fields 分離するフィールド（"all"で全フィールド）
   * @param projectRoot プロジェクトルートパス
   * @returns 更新されたCharacterと生成するファイル情報
   */
  async separateFiles(
    character: Character,
    fields: DetailField[] | "all",
    projectRoot: string,
  ): Promise<Result<SeparateFilesResult, Error>> {
    try {
      const currentDetails = character.details ?? {};

      // "all"の場合、インラインの文字列フィールドを全て分離
      let targetFields: DetailField[];
      if (fields === "all") {
        targetFields = Object.entries(currentDetails)
          .filter(([_, value]) => typeof value === "string")
          .map(([key, _]) => key as DetailField)
          .filter((key) => isValidField(key));
      } else {
        // 無効なフィールド名をチェック
        const invalidFields = fields.filter((f) => !isValidField(f));
        if (invalidFields.length > 0) {
          return err(new Error(`Invalid field names: ${invalidFields.join(", ")}`));
        }
        targetFields = fields;
      }

      const newDetails: CharacterDetails = { ...currentDetails };
      const filesToCreate: FileToCreate[] = [];

      for (const field of targetFields) {
        const currentValue = newDetails[field as keyof CharacterDetails];

        // 既にファイル参照の場合はスキップ
        if (typeof currentValue === "object" && currentValue !== null && "file" in currentValue) {
          continue;
        }

        // フィールドが存在しない場合はエラー
        if (currentValue === undefined) {
          return err(new Error(`Field '${field}' does not exist in character details`));
        }

        // development は CharacterDevelopment 型なので対象外
        if (field === "development") {
          continue;
        }

        // 文字列の場合のみ分離
        if (typeof currentValue !== "string") {
          continue;
        }

        // ファイルパスを生成
        const relativePath = `characters/${character.id}/${field}.md`;

        // Markdownコンテンツを生成
        const content = generateMarkdownContent(field, currentValue, {
          characterId: character.id,
          characterName: character.name,
        });

        // ファイル参照に変更
        if (field === "appearance") {
          newDetails.appearance = { file: relativePath };
        } else if (field === "personality") {
          newDetails.personality = { file: relativePath };
        } else if (field === "backstory") {
          newDetails.backstory = { file: relativePath };
        } else if (field === "relationships_detail") {
          newDetails.relationships_detail = { file: relativePath };
        } else if (field === "goals") {
          newDetails.goals = { file: relativePath };
        }

        filesToCreate.push({
          path: relativePath,
          content,
        });
      }

      const updatedCharacter: Character = {
        ...character,
        details: newDetails,
      };

      return ok({
        character: updatedCharacter,
        filesToCreate,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * ファイル分離の結果
 */
export type SeparateFilesResult = {
  /** 更新されたCharacter */
  character: Character;
  /** 生成するファイルの情報 */
  filesToCreate: FileToCreate[];
};

/**
 * 生成するファイルの情報
 */
export type FileToCreate = {
  /** ファイルパス（プロジェクトルートからの相対パス） */
  path: string;
  /** ファイルの内容 */
  content: string;
};
