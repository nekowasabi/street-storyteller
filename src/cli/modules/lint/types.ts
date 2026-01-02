/**
 * lint コマンドの型定義
 * Process 10-13: CLI lint基本コマンド + オプション拡充
 */
import type { CommandOptionDescriptor } from "@storyteller/cli/types.ts";

/**
 * CLI引数の型
 */
export interface LintCliOptions {
  path?: string;
  dir?: string;
  recursive?: boolean;
  fix?: boolean;
  json?: boolean;
  rule?: string;
  config?: string;
  severity?: string;
  "with-entity-check"?: boolean;
}

/**
 * パース後のオプション
 */
export interface LintCommandOptions {
  /** 単一ファイルパス */
  path?: string;
  /** ディレクトリパス */
  dir?: string;
  /** 再帰的にチェック */
  recursive: boolean;
  /** 自動修正を実行 */
  fix: boolean;
  /** JSON形式で出力 */
  json: boolean;
  /** 有効にするルール（カンマ区切り） */
  rules?: string[];
  /** 設定ファイルパス */
  config?: string;
  /** フィルタリングする重大度 */
  severity?: "error" | "warning" | "info";
  /** storytellerエンティティチェックも実行 */
  withEntityCheck: boolean;
}

/**
 * lint コマンドオプション定義
 */
export const LINT_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "path",
    summary: "チェックする単一ファイルパス",
    type: "string",
  },
  {
    name: "dir",
    summary: "チェックするディレクトリパス",
    type: "string",
  },
  {
    name: "recursive",
    summary: "ディレクトリを再帰的にチェック",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "fix",
    summary: "自動修正を実行",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "json",
    summary: "JSON形式で出力",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "rule",
    summary: "有効にするルール（カンマ区切り）",
    type: "string",
  },
  {
    name: "config",
    summary: "textlint設定ファイルパス",
    type: "string",
  },
  {
    name: "severity",
    summary: "フィルタリングする重大度: error | warning | info",
    type: "string",
  },
  {
    name: "with-entity-check",
    summary: "storytellerエンティティチェックも実行",
    type: "boolean",
    defaultValue: false,
  },
];

/**
 * CLI引数をパース
 */
export function parseLintOptions(args: LintCliOptions): LintCommandOptions {
  // ruleオプションをカンマ区切りで配列に変換
  const rules = args.rule
    ? args.rule.split(",").map((r) => r.trim())
    : undefined;

  // severityの検証
  let severity: "error" | "warning" | "info" | undefined;
  if (args.severity) {
    if (
      args.severity === "error" || args.severity === "warning" ||
      args.severity === "info"
    ) {
      severity = args.severity;
    }
  }

  return {
    path: args.path,
    dir: args.dir,
    recursive: args.recursive ?? false,
    fix: args.fix ?? false,
    json: args.json ?? false,
    rules,
    config: args.config,
    severity,
    withEntityCheck: args["with-entity-check"] ?? false,
  };
}
