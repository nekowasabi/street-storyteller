/**
 * 診断生成器
 * 未定義参照や低信頼度マッチを警告として報告する
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 */

import {
  PositionedDetector,
  type PositionedMatch,
} from "@storyteller/lsp/detection/positioned_detector.ts";

/**
 * LSP Position型
 */
export type Position = {
  readonly line: number;
  readonly character: number;
};

/**
 * LSP Range型
 */
export type Range = {
  readonly start: Position;
  readonly end: Position;
};

/**
 * 診断の重要度
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnosticSeverity
 */
export const DiagnosticSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4,
} as const;

export type DiagnosticSeverityType =
  (typeof DiagnosticSeverity)[keyof typeof DiagnosticSeverity];

/**
 * 診断情報
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 */
export type Diagnostic = {
  /** 診断対象の範囲 */
  readonly range: Range;
  /** 重要度 */
  readonly severity: DiagnosticSeverityType;
  /** 診断メッセージ */
  readonly message: string;
  /** 診断のソース（このツール名） */
  readonly source: string;
  /** エラーコード（オプション） */
  readonly code?: string;
  /** 関連情報（オプション） */
  readonly relatedInformation?: ReadonlyArray<{
    readonly location: {
      readonly uri: string;
      readonly range: Range;
    };
    readonly message: string;
  }>;
};

/**
 * 信頼度閾値
 */
const CONFIDENCE_THRESHOLD = {
  /** この値未満は警告（Warning） */
  WARNING: 0.7,
  /** この値未満はヒント（Hint）、この値以上は診断なし */
  HINT: 0.9,
};

/**
 * 診断生成器クラス
 */
export class DiagnosticsGenerator {
  private readonly detector: PositionedDetector;

  constructor(detector: PositionedDetector) {
    this.detector = detector;
  }

  /**
   * ドキュメントの診断を生成
   * @param _uri ドキュメントURI（現時点では未使用だが、将来の拡張用）
   * @param content ドキュメント内容
   * @param _projectPath プロジェクトパス（現時点では未使用だが、将来の拡張用）
   * @returns 診断の配列
   */
  async generate(
    _uri: string,
    content: string,
    _projectPath: string,
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    // 検出を実行
    const matches = this.detector.detectWithPositions(content);

    // 各マッチの信頼度をチェック
    for (const match of matches) {
      const matchDiagnostics = this.createDiagnosticsForMatch(match);
      diagnostics.push(...matchDiagnostics);
    }

    return diagnostics;
  }

  /**
   * マッチから診断を作成
   * 信頼度に応じて適切な診断を生成（全ての位置に対して診断を生成）
   */
  private createDiagnosticsForMatch(match: PositionedMatch): Diagnostic[] {
    const confidence = match.confidence;
    const diagnostics: Diagnostic[] = [];

    // 高信頼度は診断不要
    if (confidence >= CONFIDENCE_THRESHOLD.HINT) {
      return diagnostics;
    }

    const severity = confidence < CONFIDENCE_THRESHOLD.WARNING
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Hint;

    const kindLabel = match.kind === "character" ? "キャラクター" : "設定";
    const confidencePercent = Math.round(confidence * 100);

    // 全ての位置に対して診断を生成
    for (const pos of match.positions) {
      const range: Range = {
        start: { line: pos.line, character: pos.character },
        end: { line: pos.line, character: pos.character + pos.length },
      };

      diagnostics.push({
        range,
        severity,
        message: this.createMessage(match, confidencePercent, kindLabel),
        source: "storyteller",
        code: `low-confidence-${match.kind}`,
      });
    }

    return diagnostics;
  }

  /**
   * 診断メッセージを作成
   */
  private createMessage(
    match: PositionedMatch,
    confidencePercent: number,
    kindLabel: string,
  ): string {
    return `${kindLabel}「${match.matchedPattern}」への参照（信頼度: ${confidencePercent}%）。` +
      `定義: ${match.filePath}`;
  }
}
