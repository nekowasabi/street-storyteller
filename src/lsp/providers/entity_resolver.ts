/**
 * エンティティリゾルバー
 * PositionedDetectorをラップし、エンティティ解決の共通ロジックを提供
 */

import type {
  Position,
  PositionedDetector,
  PositionedMatch,
} from "../detection/positioned_detector.ts";
import { isValidContent } from "./provider_utils.ts";

/**
 * エンティティリゾルバーインターフェース
 */
export interface EntityResolver {
  /**
   * 指定位置にあるエンティティを解決
   * @param content ドキュメント内容
   * @param position カーソル位置
   * @returns 見つかったエンティティ、またはundefined
   */
  resolveAtPosition(
    content: string,
    position: Position,
  ): PositionedMatch | undefined;

  /**
   * コンテンツ内のすべてのエンティティを検出
   * @param content ドキュメント内容
   * @returns 検出されたエンティティの配列
   */
  detectAll(content: string): PositionedMatch[];
}

/**
 * エンティティリゾルバーを作成
 * @param detector PositionedDetectorインスタンス
 * @returns EntityResolverインターフェース実装
 */
export function createEntityResolver(
  detector: PositionedDetector,
): EntityResolver {
  return {
    resolveAtPosition(
      content: string,
      position: Position,
    ): PositionedMatch | undefined {
      // 空のコンテンツは処理しない
      if (!isValidContent(content)) {
        return undefined;
      }

      return detector.getEntityAtPosition(content, position);
    },

    detectAll(content: string): PositionedMatch[] {
      // 空のコンテンツは処理しない
      if (!isValidContent(content)) {
        return [];
      }

      return detector.detectWithPositions(content);
    },
  };
}
