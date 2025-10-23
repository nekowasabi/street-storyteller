/**
 * BatchOperations
 *
 * 複数キャラクターに対する一括操作を提供
 */

import { ok, err } from "../shared/result.ts";
import type { Result } from "../shared/result.ts";
import type { Character, CharacterRole } from "../type/v2/character.ts";
import { DetailsPlugin } from "../plugins/features/details/plugin.ts";
import type { DetailField } from "../plugins/features/details/templates.ts";

/**
 * 一括操作のオプション
 */
export type BatchOperationOptions = {
  /** 役割フィルタ */
  roleFilter?: CharacterRole[];
  /** チャプターフィルタ */
  chapterFilter?: string[];
};

/**
 * 一括操作の結果
 */
export type BatchOperationResult = {
  /** 更新されたキャラクターの配列 */
  updatedCharacters: Character[];
  /** 処理されたキャラクター数 */
  processedCount: number;
  /** スキップされたキャラクター数 */
  skippedCount: number;
};

/**
 * BatchOperations
 *
 * 複数のキャラクターに対して一括で詳細情報を追加する
 */
export class BatchOperations {
  private readonly detailsPlugin: DetailsPlugin;

  constructor() {
    this.detailsPlugin = new DetailsPlugin();
  }

  /**
   * 複数のキャラクターに詳細情報を一括追加する
   *
   * @param characters 対象のキャラクター配列
   * @param fields 追加する詳細フィールド
   * @param options 一括操作のオプション
   * @returns 一括操作の結果
   */
  async addDetailsToMultipleCharacters(
    characters: Character[],
    fields: DetailField[],
    options?: BatchOperationOptions,
  ): Promise<Result<BatchOperationResult, Error>> {
    try {
      // フィルタリング
      let filteredCharacters = characters;

      if (options?.roleFilter && options.roleFilter.length > 0) {
        filteredCharacters = filteredCharacters.filter((c) =>
          options.roleFilter!.includes(c.role)
        );
      }

      if (options?.chapterFilter && options.chapterFilter.length > 0) {
        filteredCharacters = filteredCharacters.filter((c) =>
          c.appearingChapters.some((ch) => options.chapterFilter!.includes(ch))
        );
      }

      // 各キャラクターに詳細を追加
      const updatedCharacters: Character[] = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const character of filteredCharacters) {
        const result = await this.detailsPlugin.addDetails(character, fields);

        if (result.ok) {
          updatedCharacters.push(result.value);
          processedCount++;
        } else {
          // エラーが発生した場合は処理を中断してエラーを返す
          return err(result.error);
        }
      }

      return ok({
        updatedCharacters,
        processedCount,
        skippedCount,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 一括処理の進捗を表示する
   *
   * @param current 現在の処理数
   * @param total 総処理数
   * @param characterName 現在処理中のキャラクター名
   */
  reportProgress(current: number, total: number, characterName: string): string {
    const percentage = Math.round((current / total) * 100);
    return `[${current}/${total}] (${percentage}%) Processing: ${characterName}`;
  }
}
