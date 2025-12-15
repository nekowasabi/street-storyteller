/**
 * 定義ジャンププロバイダー
 * キャラクター・設定の定義ファイルへのジャンプを提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_definition
 */

import {
  type Position,
  PositionedDetector,
} from "../detection/positioned_detector.ts";

/**
 * LSP Range型
 */
export type Range = {
  readonly start: Position;
  readonly end: Position;
};

/**
 * LSP Location型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#location
 */
export type Location = {
  readonly uri: string;
  readonly range: Range;
};

/**
 * 定義ジャンププロバイダークラス
 */
export class DefinitionProvider {
  private readonly detector: PositionedDetector;

  constructor(detector: PositionedDetector) {
    this.detector = detector;
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
    // 空のコンテンツは処理しない
    if (!content) {
      return null;
    }

    // 指定位置のエンティティを取得
    const entity = this.detector.getEntityAtPosition(content, position);
    if (!entity) {
      return null;
    }

    // ファイルパスをURIに変換
    const definitionUri = this.filePathToUri(entity.filePath, projectPath);

    // 定義ファイルの先頭を指すLocation
    return {
      uri: definitionUri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }

  /**
   * ファイルパスをfile:// URIに変換
   * @param filePath 相対または絶対ファイルパス
   * @param projectPath プロジェクトルートパス
   * @returns file:// URI
   */
  private filePathToUri(filePath: string, projectPath: string): string {
    // 絶対パスの場合はそのまま使用
    if (filePath.startsWith("/")) {
      return `file://${filePath}`;
    }

    // 相対パスの場合はプロジェクトパスと結合
    const absolutePath = projectPath.endsWith("/")
      ? `${projectPath}${filePath}`
      : `${projectPath}/${filePath}`;

    return `file://${absolutePath}`;
  }
}
