// src/lsp/integration/textlint/textlint_config.ts
import { join } from "@std/path";

/**
 * textlint設定
 *
 * textlint統合に必要な設定情報を保持します。
 * プロジェクトルートから設定ファイルを自動検出し、
 * デフォルト値を提供します。
 */
export interface TextlintConfig {
  /** 設定ファイルパス（見つからない場合はundefined） */
  configPath?: string;

  /** textlint実行パス（デフォルト: "npx textlint"） */
  executablePath: string;

  /** デバウンス時間（ms）（デフォルト: 500ms） */
  debounceMs: number;

  /** タイムアウト時間（ms）（デフォルト: 30000ms） */
  timeoutMs: number;

  /** 有効フラグ（デフォルト: true） */
  enabled: boolean;
}

/**
 * 設定ファイル検出順序（優先度順）
 *
 * textlintは複数の設定ファイル形式をサポートしていますが、
 * この配列の順序で検索され、最初に見つかったファイルが使用されます。
 *
 * @see https://textlint.github.io/docs/configuring.html
 */
const CONFIG_FILES = [
  ".textlintrc",
  ".textlintrc.json",
  ".textlintrc.yaml",
  ".textlintrc.yml",
  ".textlintrc.js",
  ".textlintrc.cjs",
];

/**
 * textlint設定を検出
 *
 * プロジェクトルートから設定ファイルを検索し、TextlintConfigを返します。
 * 設定ファイルが見つからない場合は、デフォルト値を使用します。
 *
 * @param projectRoot プロジェクトのルートディレクトリパス
 * @returns textlint設定オブジェクト
 *
 * @example
 * ```typescript
 * const config = await detectTextlintConfig("/path/to/project");
 * if (config.configPath) {
 *   console.log(`Using config: ${config.configPath}`);
 * }
 * ```
 */
export async function detectTextlintConfig(
  projectRoot: string,
): Promise<TextlintConfig> {
  let configPath: string | undefined;

  // 設定ファイルを優先順位順に探索
  for (const configFile of CONFIG_FILES) {
    const fullPath = join(projectRoot, configFile);
    try {
      await Deno.stat(fullPath);
      configPath = fullPath;
      break;
    } catch {
      // ファイルが存在しない
    }
  }

  // package.jsonのtextlintフィールドは後で対応

  return {
    configPath,
    executablePath: "npx textlint",
    debounceMs: 500,
    timeoutMs: 30000,
    enabled: true,
  };
}
