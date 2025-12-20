/**
 * EntityDetailsExpander
 *
 * 動的インポートからエンティティを読み込み、detailsフィールドを展開する共通ユーティリティ
 * FileContentReaderを使用してハイブリッドフィールド（文字列/ファイル参照）を解決する
 */

import { join, toFileUrl } from "@std/path";
import {
  FileContentReader,
  type HybridFieldValue,
} from "@storyteller/plugins/features/details/file_content_reader.ts";
import { err, ok } from "@storyteller/shared/result.ts";
import type { Result } from "@storyteller/shared/result.ts";

/**
 * 展開エラーの種類
 */
export type ExpandDetailsErrorType =
  | "import_failed"
  | "entity_not_found"
  | "no_details";

/**
 * 展開エラー
 */
export type ExpandDetailsError = {
  type: ExpandDetailsErrorType;
  message: string;
};

/**
 * 展開結果
 * @template T サマリー型
 */
export type ExpandedEntity<T> = T & {
  details: Record<string, string | undefined>;
};

/**
 * エンティティ詳細展開オプション
 */
export interface ExpandDetailsOptions {
  /** プロジェクトルートパス */
  projectRoot: string;
  /** エンティティファイルの相対パス */
  filePath: string;
  /** エンティティID */
  entityId: string;
}

/**
 * EntityDetailsExpander
 *
 * エンティティのdetailsフィールドを展開するユーティリティクラス
 */
export class EntityDetailsExpander {
  private readonly reader: FileContentReader;

  constructor(private readonly projectRoot: string) {
    this.reader = new FileContentReader(projectRoot);
  }

  /**
   * エンティティファイルからdetailsを読み込み展開する
   *
   * @param filePath プロジェクトルートからの相対パス
   * @param entityId 対象エンティティのID
   * @returns 展開されたdetailsオブジェクト、またはエラー
   */
  async expandFromFile(
    filePath: string,
    entityId: string,
  ): Promise<Result<Record<string, string | undefined>, ExpandDetailsError>> {
    const absPath = join(this.projectRoot, filePath);

    // 動的インポート
    let mod: Record<string, unknown>;
    try {
      mod = await import(toFileUrl(absPath).href);
    } catch (error) {
      return err({
        type: "import_failed",
        message: `Failed to import entity file: ${filePath} - ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }

    // エクスポートされたオブジェクトからidが一致するものを探す
    let originalEntity: Record<string, unknown> | undefined;
    for (const [, value] of Object.entries(mod)) {
      if (
        value &&
        typeof value === "object" &&
        (value as Record<string, unknown>).id === entityId
      ) {
        originalEntity = value as Record<string, unknown>;
        break;
      }
    }

    if (!originalEntity) {
      return err({
        type: "entity_not_found",
        message: `Entity not found in file: ${entityId}`,
      });
    }

    const details = originalEntity.details as
      | Record<string, HybridFieldValue>
      | undefined;

    if (!details) {
      return err({
        type: "no_details",
        message: `Entity '${entityId}' has no details field`,
      });
    }

    // detailsを展開（ソースファイルパスを渡す）
    return await this.expandDetails(details, filePath);
  }

  /**
   * detailsオブジェクトのハイブリッドフィールドを展開する
   *
   * @param details 展開対象のdetailsオブジェクト
   * @param sourceFilePath ファイル参照の基準となるソースファイルのパス（プロジェクトルートからの相対パス）
   * @returns 展開されたdetailsオブジェクト
   */
  async expandDetails(
    details: Record<string, HybridFieldValue>,
    sourceFilePath?: string,
  ): Promise<Result<Record<string, string | undefined>, ExpandDetailsError>> {
    const expandedDetails: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(details)) {
      const result = await this.reader.resolveHybridField(
        value,
        sourceFilePath,
      );
      if (result.ok) {
        expandedDetails[key] = result.value;
      } else {
        // ファイル読み込みエラーの場合はundefinedとする
        expandedDetails[key] = undefined;
      }
    }

    return ok(expandedDetails);
  }

  /**
   * サマリーオブジェクトにdetailsを展開して追加する
   *
   * @template T サマリー型
   * @param summary サマリーオブジェクト
   * @param filePath エンティティファイルの相対パス
   * @param entityId エンティティID
   * @returns 展開されたエンティティ、またはエラー時は元のサマリー
   */
  async expandEntityDetails<T extends { id: string }>(
    summary: T,
    filePath: string,
    entityId: string,
  ): Promise<T | ExpandedEntity<T>> {
    const result = await this.expandFromFile(filePath, entityId);

    if (!result.ok) {
      // エラー時は元のサマリーをそのまま返す
      return summary;
    }

    return {
      ...summary,
      details: result.value,
    };
  }
}
