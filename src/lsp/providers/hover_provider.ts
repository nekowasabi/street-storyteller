/**
 * ホバー情報プロバイダー
 * キャラクター・設定のホバー情報を提供
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_hover
 */

import {
  type Position,
  PositionedDetector,
  type PositionedMatch,
} from "../detection/positioned_detector.ts";
import type { Hover, MarkupContent, Range } from "./lsp_types.ts";
import {
  createEntityResolver,
  type EntityResolver,
} from "./entity_resolver.ts";

// 型の再エクスポート（後方互換性のため）
export type { Hover, MarkupContent, Range };

/**
 * 回収情報型（foreshadowing用）
 */
export type ResolutionInfo = {
  readonly chapter: string;
  readonly description: string;
  readonly completeness: number;
};

/**
 * エンティティの詳細情報
 * ホバー表示用に使用
 */
export type EntityInfo = {
  readonly id: string;
  readonly name: string;
  readonly kind: "character" | "setting" | "foreshadowing";
  /** キャラクターの役割（characterの場合のみ） */
  readonly role?: string;
  /** 概要 */
  readonly summary?: string;
  /** 特徴（characterの場合のみ） */
  readonly traits?: readonly string[];
  /** 関係性マップ（characterの場合のみ） */
  readonly relationships?: Record<string, string>;
  // --- foreshadowing用フィールド ---
  /** 伏線のタイプ（foreshadowingの場合のみ） */
  readonly type?: string;
  /** 伏線のステータス（foreshadowingの場合のみ） */
  readonly status?: string;
  /** 設置章（foreshadowingの場合のみ） */
  readonly plantingChapter?: string;
  /** 設置の説明（foreshadowingの場合のみ） */
  readonly plantingDescription?: string;
  /** 回収情報リスト（foreshadowingの場合のみ） */
  readonly resolutions?: readonly ResolutionInfo[];
  /** 関連キャラクター（foreshadowingの場合のみ） */
  readonly relatedCharacters?: readonly string[];
  /** 関連設定（foreshadowingの場合のみ） */
  readonly relatedSettings?: readonly string[];
};

/**
 * ホバー情報プロバイダークラス
 */
export class HoverProvider {
  private readonly resolver: EntityResolver;
  private readonly entityInfoMap: Map<string, EntityInfo>;

  /**
   * @param detector 位置追跡付き検出器
   * @param entityInfoMap エンティティID → 詳細情報のマップ
   */
  constructor(
    detector: PositionedDetector,
    entityInfoMap: Map<string, EntityInfo>,
  ) {
    this.resolver = createEntityResolver(detector);
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
    _projectPath: string,
  ): Promise<Hover | null> {
    // 共通リゾルバーでエンティティを解決
    const match = this.resolver.resolveAtPosition(content, position);
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
          start: {
            line: matchPosition.line,
            character: matchPosition.character,
          },
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
    entityInfo?: EntityInfo,
  ): string {
    const lines: string[] = [];
    const kindLabel = this.getKindLabel(match.kind);

    // ヘッダー
    lines.push(`## ${match.matchedPattern}`);
    lines.push(`**種類**: ${kindLabel}`);

    // 信頼度
    const confidencePercent = Math.round(match.confidence * 100);
    lines.push(`**信頼度**: ${confidencePercent}%`);

    // 詳細情報がある場合
    if (entityInfo) {
      // character/setting共通
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

      if (
        entityInfo.relationships &&
        Object.keys(entityInfo.relationships).length > 0
      ) {
        lines.push("");
        lines.push("**関係性**:");
        for (
          const [target, relation] of Object.entries(entityInfo.relationships)
        ) {
          lines.push(`- ${target}: ${relation}`);
        }
      }

      // foreshadowing固有の情報
      if (match.kind === "foreshadowing") {
        this.appendForeshadowingInfo(lines, match, entityInfo);
      }
    } else if (match.kind === "foreshadowing" && match.status) {
      // entityInfoがなくてもmatchからステータスは取得可能
      lines.push(`**ステータス**: ${this.getStatusLabel(match.status)}`);
    }

    // ファイルパス
    lines.push("");
    lines.push(`*定義: ${match.filePath}*`);

    return lines.join("\n");
  }

  /**
   * kindのラベルを取得
   */
  private getKindLabel(
    kind: "character" | "setting" | "foreshadowing",
  ): string {
    switch (kind) {
      case "character":
        return "キャラクター";
      case "setting":
        return "設定";
      case "foreshadowing":
        return "伏線";
    }
  }

  /**
   * ステータスのラベルを取得
   */
  private getStatusLabel(status: string): string {
    switch (status) {
      case "planted":
        return "未回収 (planted)";
      case "partially_resolved":
        return "部分回収 (partially_resolved)";
      case "resolved":
        return "回収済み (resolved)";
      case "abandoned":
        return "破棄 (abandoned)";
      default:
        return status;
    }
  }

  /**
   * 伏線タイプのラベルを取得
   */
  private getForeshadowingTypeLabel(type: string): string {
    switch (type) {
      case "hint":
        return "ヒント (hint)";
      case "prophecy":
        return "予言 (prophecy)";
      case "mystery":
        return "謎 (mystery)";
      case "symbol":
        return "象徴 (symbol)";
      case "chekhov":
        return "チェーホフの銃 (chekhov)";
      case "red_herring":
        return "ミスリード (red_herring)";
      default:
        return type;
    }
  }

  /**
   * 伏線固有の情報を追加
   */
  private appendForeshadowingInfo(
    lines: string[],
    match: PositionedMatch,
    entityInfo: EntityInfo,
  ): void {
    // ステータス（entityInfo優先、なければmatchから）
    const status = entityInfo.status || match.status;
    if (status) {
      lines.push("");
      lines.push(`**ステータス**: ${this.getStatusLabel(status)}`);
    }

    // タイプ
    if (entityInfo.type) {
      lines.push(
        `**タイプ**: ${this.getForeshadowingTypeLabel(entityInfo.type)}`,
      );
    }

    // 設置情報
    if (entityInfo.plantingChapter || entityInfo.plantingDescription) {
      lines.push("");
      lines.push("**設置**:");
      if (entityInfo.plantingChapter) {
        lines.push(`- 章: ${entityInfo.plantingChapter}`);
      }
      if (entityInfo.plantingDescription) {
        lines.push(`- 説明: ${entityInfo.plantingDescription}`);
      }
    }

    // 回収情報
    if (entityInfo.resolutions && entityInfo.resolutions.length > 0) {
      lines.push("");
      lines.push("**回収**:");
      for (const res of entityInfo.resolutions) {
        const completenessPercent = Math.round(res.completeness * 100);
        lines.push(
          `- ${res.chapter}: ${res.description} (${completenessPercent}%)`,
        );
      }
    }

    // 関連キャラクター
    if (
      entityInfo.relatedCharacters && entityInfo.relatedCharacters.length > 0
    ) {
      lines.push("");
      lines.push(
        `**関連キャラクター**: ${entityInfo.relatedCharacters.join(", ")}`,
      );
    }

    // 関連設定
    if (entityInfo.relatedSettings && entityInfo.relatedSettings.length > 0) {
      lines.push(`**関連設定**: ${entityInfo.relatedSettings.join(", ")}`);
    }
  }

  /**
   * マッチの位置情報を取得
   */
  private findMatchPosition(
    match: PositionedMatch,
    position: Position,
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
