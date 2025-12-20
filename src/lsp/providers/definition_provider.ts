/**
 * 定義ジャンププロバイダー
 * キャラクター・設定の定義ファイルへのジャンプを提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_definition
 */

import {
  type Position,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";
import type { Location, Range } from "@storyteller/lsp/providers/lsp_types.ts";
import {
  createEntityResolver,
  type EntityResolver,
} from "@storyteller/lsp/providers/entity_resolver.ts";
import { filePathToUri } from "@storyteller/lsp/providers/provider_utils.ts";
import {
  debugLog,
  detectAndResolveFileRef,
} from "@storyteller/lsp/providers/file_ref_utils.ts";

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
   * @param uri ドキュメントURI
   * @param content ドキュメント内容
   * @param position カーソル位置
   * @param projectPath プロジェクトルートパス
   * @returns 定義のLocation、または見つからない場合はnull
   */
  async getDefinition(
    uri: string,
    content: string,
    position: Position,
    projectPath: string,
  ): Promise<Location | null> {
    debugLog(`getDefinition: uri=${uri}, line=${position.line}, char=${position.character}`);

    // ファイル参照定義ジャンプを先にチェック（共通ユーティリティ使用）
    const fileRefLocation = this.getFileRefDefinition(uri, content, position);
    if (fileRefLocation) {
      return fileRefLocation;
    }

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

  /**
   * ファイル参照の定義位置を取得
   * { file: "./path.md" } パターンにカーソルがある場合、参照先ファイルのLocationを返す
   */
  private getFileRefDefinition(
    uri: string,
    content: string,
    position: Position,
  ): Location | null {
    // 共通ユーティリティでファイル参照を検出・解決
    const detected = detectAndResolveFileRef(uri, content, position);
    if (!detected) {
      return null;
    }

    const { resolvedPath } = detected;
    debugLog(`getFileRefDefinition: jumping to ${resolvedPath}`);

    // file://プロトコル付きURIに変換
    const fileUri = `file://${resolvedPath}`;

    // 参照先ファイルの先頭を指すLocation
    return {
      uri: fileUri,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }
}
