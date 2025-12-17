/**
 * セマンティックトークンプロバイダー
 * キャラクター・設定名のハイライト用トークンを提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens
 */

import {
  PositionedDetector,
  type PositionedMatch,
} from "../detection/positioned_detector.ts";
import type { Range, SemanticTokens } from "./lsp_types.ts";
import {
  SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TOKEN_TYPES,
} from "../server/capabilities.ts";

/**
 * トークン位置情報（ソート用）
 */
type TokenPosition = {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly tokenType: number;
  readonly modifierMask: number;
};

/**
 * セマンティックトークンプロバイダークラス
 */
export class SemanticTokensProvider {
  private readonly detector: PositionedDetector;

  /**
   * @param detector 位置追跡付き検出器
   */
  constructor(detector: PositionedDetector) {
    this.detector = detector;
  }

  /**
   * 全ドキュメントのセマンティックトークンを取得
   * @param _uri ドキュメントURI（現時点では未使用）
   * @param content ドキュメント内容
   * @param _projectPath プロジェクトルートパス（現時点では未使用）
   * @returns セマンティックトークン
   */
  getSemanticTokens(
    _uri: string,
    content: string,
    _projectPath: string,
  ): SemanticTokens {
    if (!content || content.trim().length === 0) {
      return { data: [] };
    }

    const matches = this.detector.detectWithPositions(content);
    const tokens = this.convertMatchesToTokens(matches);
    const data = this.encodeTokens(tokens);

    return { data };
  }

  /**
   * 範囲指定でセマンティックトークンを取得
   * @param _uri ドキュメントURI
   * @param content ドキュメント内容
   * @param range 取得範囲
   * @param _projectPath プロジェクトルートパス
   * @returns 範囲内のセマンティックトークン
   */
  getSemanticTokensRange(
    _uri: string,
    content: string,
    range: Range,
    _projectPath: string,
  ): SemanticTokens {
    if (!content || content.trim().length === 0) {
      return { data: [] };
    }

    const matches = this.detector.detectWithPositions(content);
    const allTokens = this.convertMatchesToTokens(matches);

    // 範囲内のトークンのみフィルタリング
    const filteredTokens = allTokens.filter((token) =>
      this.isTokenInRange(token, range)
    );

    // 範囲の開始行を基準にline_deltaを再計算
    const adjustedTokens = filteredTokens.map((token) => ({
      ...token,
      line: token.line - range.start.line,
    }));

    const data = this.encodeTokens(adjustedTokens);

    return { data };
  }

  /**
   * マッチ結果をトークン位置に変換
   */
  private convertMatchesToTokens(matches: PositionedMatch[]): TokenPosition[] {
    const tokens: TokenPosition[] = [];

    for (const match of matches) {
      const tokenType = this.getTokenTypeIndex(match.kind);
      let modifierMask = this.getModifierMask(match.confidence);

      // foreshadowingの場合、ステータスモディファイアを追加
      if (match.kind === "foreshadowing" && match.status) {
        modifierMask |= this.getStatusModifierMask(match.status);
      }

      for (const pos of match.positions) {
        tokens.push({
          line: pos.line,
          character: pos.character,
          length: pos.length,
          tokenType,
          modifierMask,
        });
      }
    }

    // 位置でソート（行 → 文字位置）
    tokens.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.character - b.character;
    });

    return tokens;
  }

  /**
   * トークンをLSP形式にエンコード
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens
   */
  private encodeTokens(tokens: TokenPosition[]): number[] {
    const data: number[] = [];
    let previousLine = 0;
    let previousCharacter = 0;

    for (const token of tokens) {
      // 差分エンコーディング
      const lineDelta = token.line - previousLine;
      const charDelta = lineDelta === 0
        ? token.character - previousCharacter
        : token.character;

      data.push(
        lineDelta,
        charDelta,
        token.length,
        token.tokenType,
        token.modifierMask,
      );

      previousLine = token.line;
      previousCharacter = token.character;
    }

    return data;
  }

  /**
   * エンティティ種別からトークンタイプインデックスを取得
   */
  private getTokenTypeIndex(
    kind: "character" | "setting" | "foreshadowing",
  ): number {
    const index = SEMANTIC_TOKEN_TYPES.indexOf(kind);
    return index >= 0 ? index : 0;
  }

  /**
   * 信頼度からモディファイアビットマスクを取得
   */
  private getModifierMask(confidence: number): number {
    // highConfidence: bit 0 (confidence >= 0.9)
    // mediumConfidence: bit 1 (0.7 <= confidence < 0.9)
    // lowConfidence: bit 2 (confidence < 0.7)

    if (confidence >= 0.9) {
      return 1; // bit 0
    } else if (confidence >= 0.7) {
      return 2; // bit 1
    } else {
      return 4; // bit 2
    }
  }

  /**
   * 伏線ステータスからモディファイアビットマスクを取得
   */
  private getStatusModifierMask(status: string): number {
    // planted: bit 3 = 8
    // resolved: bit 4 = 16
    switch (status) {
      case "planted":
        return 8; // bit 3
      case "partially_resolved":
        return 8; // bit 3 (未完了として扱う)
      case "resolved":
        return 16; // bit 4
      case "abandoned":
        return 0; // 特別なモディファイアなし
      default:
        return 0;
    }
  }

  /**
   * トークンが範囲内かどうかを判定
   */
  private isTokenInRange(token: TokenPosition, range: Range): boolean {
    // トークンが範囲より前にある場合
    if (token.line < range.start.line) return false;
    if (
      token.line === range.start.line &&
      token.character + token.length <= range.start.character
    ) {
      return false;
    }

    // トークンが範囲より後にある場合
    if (token.line > range.end.line) return false;
    if (
      token.line === range.end.line &&
      token.character >= range.end.character
    ) {
      return false;
    }

    return true;
  }
}
