/**
 * textlint共有型定義
 * CLI/MCPで共有するtextlint関連の型
 */

/**
 * textlintチェック結果
 */
export interface TextlintCheckResult {
  /** チェックしたファイル総数 */
  totalFiles: number;
  /** 検出された問題の総数 */
  totalIssues: number;
  /** エラー件数 */
  errorCount: number;
  /** 警告件数 */
  warningCount: number;
  /** 情報件数 */
  infoCount: number;
  /** ファイル毎の結果 */
  results: TextlintFileResult[];
}

/**
 * ファイル単位の結果
 */
export interface TextlintFileResult {
  /** ファイルパス */
  path: string;
  /** 検出された問題リスト */
  issues: TextlintIssue[];
}

/**
 * 個別の問題
 */
export interface TextlintIssue {
  /** ルールID */
  ruleId: string;
  /** 重大度 */
  severity: "error" | "warning" | "info";
  /** メッセージ */
  message: string;
  /** 行番号 (1-based) */
  line: number;
  /** 列番号 (1-based) */
  column: number;
  /** ソース（常に"textlint"） */
  source: "textlint";
}

/**
 * textlint修正結果
 */
export interface TextlintFixResult {
  /** 修正が行われたかどうか */
  fixed: boolean;
  /** ファイルパス */
  path: string;
  /** 修正された問題の数 */
  fixedCount: number;
}

/**
 * チェックオプション
 */
export interface TextlintCheckOptions {
  /** 単一ファイルパス */
  path?: string;
  /** ディレクトリパス */
  dir?: string;
  /** 再帰的にチェック */
  recursive?: boolean;
  /** 有効にするルール */
  rules?: string[];
  /** フィルタリングする重大度 */
  severity?: "error" | "warning" | "info";
  /** storytellerエンティティチェックも実行 */
  withEntityCheck?: boolean;
}

/**
 * 修正オプション
 */
export interface TextlintFixOptions {
  /** ファイルパス（必須） */
  path: string;
  /** 有効にするルール */
  rules?: string[];
  /** ドライラン（実際には修正しない） */
  dryRun?: boolean;
}
