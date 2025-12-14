/**
 * ホバー情報プロバイダー
 * キャラクター・設定のホバー情報を提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_hover
 */

import {
  PositionedDetector,
  type Position,
  type PositionedMatch,
} from "../detection/positioned_detector.ts";

/**
 * LSP Range型
 */
export type Range = {
  readonly start: Position;
  readonly end: Position;
};

/**
 * LSP MarkupContent型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#markupContent
 */
export type MarkupContent = {
  readonly kind: "plaintext" | "markdown";
  readonly value: string;
};

/**
 * LSP Hover型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#hover
 */
export type Hover = {
  readonly contents: MarkupContent;
  readonly range?: Range;
};

/**
 * エンティティの詳細情報
 * ホバー表示用に使用
 */
export type EntityInfo = {
  readonly id: string;
  readonly name: string;
  readonly kind: "character" | "setting";
  /** キャラクターの役割（characterの場合のみ） */
  readonly role?: string;
  /** 概要 */
  readonly summary?: string;
  /** 特徴（characterの場合のみ） */
  readonly traits?: readonly string[];
  /** 関係性マップ（characterの場合のみ） */
  readonly relationships?: Record<string, string>;
};

/**
 * ホバー情報プロバイダークラス
 */
export class HoverProvider {
  private readonly detector: PositionedDetector;
  private readonly entityInfoMap: Map<string, EntityInfo>;

  /**
   * @param detector 位置追跡付き検出器
   * @param entityInfoMap エンティティID → 詳細情報のマップ
   */
  constructor(
    detector: PositionedDetector,
    entityInfoMap: Map<string, EntityInfo>
  ) {
    this.detector = detector;
    this.entityInfoMap = entityInfoMap;
  }

  /**
   * 指定位置のホバー情報を取得
   * @param _uri ドキュメントURI（現時点では未使用）
   * @param content ドキュメント内容
   * @param position カーソル位置
   * @param _projectPath プロジェクトルートパス（現時点では未使用）
   * @returns ホバー情報、または見つからない場合はnull
   */
  async getHover(
    _uri: string,
    content: string,
    position: Position,
    _projectPath: string
  ): Promise<Hover | null> {
    // 空のコンテンツは処理しない
    if (!content) {
      return null;
    }

    // 指定位置のエンティティを取得
    const match = this.detector.getEntityAtPosition(content, position);
    if (!match) {
      return null;
    }

    // エンティティの詳細情報を取得
    const entityInfo = this.entityInfoMap.get(match.id);

    // Markdown形式のホバーコンテンツを生成
    const markdownContent = this.generateMarkdown(match, entityInfo);

    // マッチ位置からrangeを取得
    const matchPosition = this.findMatchPosition(match, position);

    return {
      contents: {
        kind: "markdown",
        value: markdownContent,
      },
      range: matchPosition
        ? {
            start: { line: matchPosition.line, character: matchPosition.character },
            end: {
              line: matchPosition.line,
              character: matchPosition.character + matchPosition.length,
            },
          }
        : undefined,
    };
  }

  /**
   * ホバー表示用のMarkdownを生成
   */
  private generateMarkdown(
    match: PositionedMatch,
    entityInfo?: EntityInfo
  ): string {
    const lines: string[] = [];
    const kindLabel = match.kind === "character" ? "キャラクター" : "設定";

    // ヘッダー
    lines.push(`## ${match.matchedPattern}`);
    lines.push(`**種類**: ${kindLabel}`);

    // 信頼度
    const confidencePercent = Math.round(match.confidence * 100);
    lines.push(`**信頼度**: ${confidencePercent}%`);

    // 詳細情報がある場合
    if (entityInfo) {
      if (entityInfo.role) {
        lines.push(`**役割**: ${entityInfo.role}`);
      }

      if (entityInfo.summary) {
        lines.push("");
        lines.push(`> ${entityInfo.summary}`);
      }

      if (entityInfo.traits && entityInfo.traits.length > 0) {
        lines.push("");
        lines.push(`**特徴**: ${entityInfo.traits.join(", ")}`);
      }

      if (entityInfo.relationships && Object.keys(entityInfo.relationships).length > 0) {
        lines.push("");
        lines.push("**関係性**:");
        for (const [target, relation] of Object.entries(entityInfo.relationships)) {
          lines.push(`- ${target}: ${relation}`);
        }
      }
    }

    // ファイルパス
    lines.push("");
    lines.push(`*定義: ${match.filePath}*`);

    return lines.join("\n");
  }

  /**
   * マッチの位置情報を取得
   */
  private findMatchPosition(
    match: PositionedMatch,
    position: Position
  ): { line: number; character: number; length: number } | undefined {
    // 指定位置を含む位置を探す
    for (const pos of match.positions) {
      if (
        pos.line === position.line &&
        position.character >= pos.character &&
        position.character < pos.character + pos.length
      ) {
        return pos;
      }
    }

    // 見つからない場合は最初の位置を返す
    return match.positions[0];
  }
}
