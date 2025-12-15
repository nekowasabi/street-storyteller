/**
 * 定義ジャンププロバイダー
 * キャラクター・設定の定義ファイルへのジャンプを提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_definition
 */

import {
  type Position,
  PositionedDetector,
} from "../detection/positioned_detector.ts";
import type { Location, Range } from "./lsp_types.ts";
import {
  createEntityResolver,
  type EntityResolver,
} from "./entity_resolver.ts";
import { filePathToUri } from "./provider_utils.ts";

// 型の再エクスポート（後方互換性のため）
export type { Location, Range };

/**
 * 定義ジャンププロバイダークラス
 */
export class DefinitionProvider {
  private readonly resolver: EntityResolver;

  constructor(detector: PositionedDetector) {
    this.resolver = createEntityResolver(detector);
  }

  /**
   * 指定位置の定義を取得
   * @param _uri ドキュメントURI（現時点では未使用だが、将来の拡張用）
   * @param content ドキュメント内容
   * @param position カーソル位置
   * @param projectPath プロジェクトルートパス
   * @returns 定義のLocation、または見つからない場合はnull
   */
  async getDefinition(
    _uri: string,
    content: string,
    position: Position,
    projectPath: string,
  ): Promise<Location | null> {
    // 共通リゾルバーでエンティティを解決
    const entity = this.resolver.resolveAtPosition(content, position);
    if (!entity) {
      return null;
    }

    // ファイルパスをURIに変換（共通ユーティリティ使用）
    const definitionUri = filePathToUri(entity.filePath, projectPath);

    // 定義ファイルの先頭を指すLocation
    return {
      uri: definitionUri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }
}
