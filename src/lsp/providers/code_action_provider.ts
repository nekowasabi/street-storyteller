/**
 * Code Actionプロバイダー
 * 低信頼度の参照に対してQuick Fixを提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
 */

import {
  PositionedDetector,
  type PositionedMatch,
} from "../detection/positioned_detector.ts";
import type { Range, TextEdit, WorkspaceEdit, Diagnostic, CodeAction } from "./lsp_types.ts";
import { createEntityResolver, type EntityResolver } from "./entity_resolver.ts";
import { isValidContent } from "./provider_utils.ts";

// 型の再エクスポート（後方互換性のため）
export type { Range, TextEdit, WorkspaceEdit, Diagnostic, CodeAction };

/**
 * Code Action提案の閾値
 * この値以下の信頼度の参照に対してQuick Fixを提案する
 * - name: 1.0 -> 対象外
 * - displayName: 0.9 -> 対象外
 * - alias: 0.8 -> 対象
 */
const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Code Actionプロバイダークラス
 */
export class CodeActionProvider {
  private readonly resolver: EntityResolver;

  constructor(detector: PositionedDetector) {
    this.resolver = createEntityResolver(detector);
  }

  /**
   * 指定範囲のCode Actionを取得
   * @param uri ドキュメントURI
   * @param content ドキュメント内容
   * @param range 要求された範囲
   * @param _diagnostics 現在の診断情報（将来の拡張用）
   * @param _projectPath プロジェクトルートパス（将来の拡張用）
   * @returns Code Action配列
   */
  async getCodeActions(
    uri: string,
    content: string,
    range: Range,
    _diagnostics: Diagnostic[],
    _projectPath: string,
  ): Promise<CodeAction[]> {
    // 共通ユーティリティで空コンテンツをチェック
    if (!isValidContent(content)) {
      return [];
    }

    // @付きの参照は処理しない
    if (this.isAtPrefixedReference(content, range)) {
      return [];
    }

    // 共通リゾルバーで全エンティティを検出
    const matches = this.resolver.detectAll(content);
    const codeActions: CodeAction[] = [];

    for (const match of matches) {
      // 信頼度が閾値を超える場合はスキップ
      if (match.confidence > CONFIDENCE_THRESHOLD) {
        continue;
      }

      // 範囲内にある位置を検出
      const positionsInRange = this.getPositionsInRange(match, range);
      if (positionsInRange.length === 0) {
        continue;
      }

      // 各位置に対してCode Actionを生成
      for (const pos of positionsInRange) {
        const action = this.createCodeAction(uri, match, pos);
        codeActions.push(action);
      }
    }

    return codeActions;
  }

  /**
   * @付きの参照かどうかをチェック
   */
  private isAtPrefixedReference(content: string, range: Range): boolean {
    const lines = content.split("\n");
    const line = lines[range.start.line];
    if (!line) return false;

    // 範囲開始位置の前に@があるかチェック
    const beforePos = range.start.character;
    if (beforePos > 0 && line[beforePos - 1] === "@") {
      return true;
    }
    // 範囲開始位置が@であるかチェック
    if (line[range.start.character] === "@") {
      return true;
    }

    return false;
  }

  /**
   * 範囲内にあるマッチ位置を取得
   */
  private getPositionsInRange(
    match: PositionedMatch,
    range: Range,
  ): Array<{ line: number; character: number; length: number }> {
    return match.positions.filter((pos) => {
      // 位置が範囲内にあるかチェック
      return this.isPositionInRange(pos, range);
    });
  }

  /**
   * 位置が範囲内にあるかチェック
   */
  private isPositionInRange(
    pos: { line: number; character: number; length: number },
    range: Range,
  ): boolean {
    // 単純な行・文字位置の範囲チェック
    if (pos.line < range.start.line || pos.line > range.end.line) {
      return false;
    }

    if (pos.line === range.start.line && pos.line === range.end.line) {
      // 同じ行内
      return pos.character >= range.start.character &&
        pos.character < range.end.character;
    }

    if (pos.line === range.start.line) {
      return pos.character >= range.start.character;
    }

    if (pos.line === range.end.line) {
      return pos.character < range.end.character;
    }

    return true;
  }

  /**
   * Code Actionを作成
   */
  private createCodeAction(
    uri: string,
    match: PositionedMatch,
    pos: { line: number; character: number; length: number },
  ): CodeAction {
    const newText = `@${match.id}`;
    const confidencePercent = Math.round(match.confidence * 100);

    return {
      title: `明示的参照に変換: ${match.matchedPattern} -> ${newText} (現在の信頼度: ${confidencePercent}%)`,
      kind: "quickfix",
      isPreferred: true,
      edit: {
        changes: {
          [uri]: [
            {
              range: {
                start: { line: pos.line, character: pos.character },
                end: { line: pos.line, character: pos.character + pos.length },
              },
              newText,
            },
          ],
        },
      },
    };
  }
}
