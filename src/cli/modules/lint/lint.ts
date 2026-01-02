/**
 * lint コマンド実装
 * Process 10-13: CLI lint基本コマンド + オプション拡充
 */
import type { CommandDescriptor } from "@storyteller/cli/types.ts";
import type { LintCliOptions, LintCommandOptions } from "./types.ts";
import { LINT_OPTIONS, parseLintOptions } from "./types.ts";
import { TextlintRunner } from "@storyteller/shared/textlint/runner.ts";
import type {
  TextlintCheckOptions,
  TextlintCheckResult,
  TextlintFixResult,
} from "@storyteller/shared/textlint/types.ts";

/**
 * lint実行関数
 */
export async function executeLint(
  options: LintCommandOptions,
  projectRoot: string,
): Promise<TextlintCheckResult | TextlintFixResult[] | null> {
  const runner = new TextlintRunner(projectRoot);

  // --fixオプションが指定されている場合は修正モード
  if (options.fix) {
    if (!options.path) {
      console.error("Error: --fix requires --path option");
      return null;
    }

    const fixOptions = {
      path: options.path,
      rules: options.rules,
      dryRun: false,
    };

    return await runner.fix(fixOptions);
  }

  // チェックモード
  const checkOptions: TextlintCheckOptions = {
    path: options.path,
    dir: options.dir,
    recursive: options.recursive,
    rules: options.rules,
    severity: options.severity,
    withEntityCheck: options.withEntityCheck,
  };

  return await runner.check(checkOptions);
}

/**
 * 結果をフォーマットして出力
 */
export function formatLintResult(
  result: TextlintCheckResult | TextlintFixResult[] | null,
  options: LintCommandOptions,
): void {
  if (!result) {
    return;
  }

  // JSON出力
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 通常出力
  if (Array.isArray(result)) {
    // 修正結果
    formatFixResult(result);
  } else {
    // チェック結果
    formatCheckResult(result);
  }
}

/**
 * チェック結果をフォーマット
 */
function formatCheckResult(result: TextlintCheckResult): void {
  if (result.totalIssues === 0) {
    console.log("✓ No issues found");
    return;
  }

  console.log(
    `\nFound ${result.totalIssues} issues in ${result.totalFiles} files:`,
  );
  console.log(`  Errors: ${result.errorCount}`);
  console.log(`  Warnings: ${result.warningCount}`);
  console.log(`  Info: ${result.infoCount}\n`);

  // ファイル毎の問題を表示
  for (const fileResult of result.results) {
    console.log(`\n${fileResult.path}:`);
    for (const issue of fileResult.issues) {
      const severity = issue.severity.toUpperCase();
      const icon = issue.severity === "error"
        ? "✗"
        : issue.severity === "warning"
        ? "⚠"
        : "ℹ";
      console.log(
        `  ${icon} ${severity} [${issue.ruleId}] ${issue.message} (${issue.line}:${issue.column})`,
      );
    }
  }

  console.log("");
}

/**
 * 修正結果をフォーマット
 */
function formatFixResult(results: TextlintFixResult[]): void {
  const fixedFiles = results.filter((r) => r.fixed);

  if (fixedFiles.length === 0) {
    console.log("✓ No issues to fix");
    return;
  }

  console.log(`\n✓ Fixed ${fixedFiles.length} files:`);
  for (const result of fixedFiles) {
    console.log(`  ${result.path} (${result.fixedCount} issues fixed)`);
  }
  console.log("");
}

/**
 * lint コマンドディスクリプタ
 */
export const lintCommandDescriptor: CommandDescriptor = {
  name: "lint",
  summary: "原稿の文法チェック（textlint統合）",
  description:
    "textlintを使用して原稿ファイルの文法・表記をチェックします。\n" +
    "--fixオプションで自動修正も可能です。",
  usage: "storyteller lint [options]",
  options: LINT_OPTIONS,
  examples: [
    {
      command: "storyteller lint",
      summary: "manuscripts/配下を再帰的にチェック",
    },
    {
      command: "storyteller lint --path manuscripts/chapter01.md",
      summary: "特定ファイルをチェック",
    },
    {
      command: "storyteller lint --dir manuscripts --recursive",
      summary: "ディレクトリを再帰的にチェック",
    },
    {
      command: "storyteller lint --path manuscripts/chapter01.md --fix",
      summary: "自動修正を実行",
    },
    {
      command: "storyteller lint --json",
      summary: "JSON形式で出力",
    },
    {
      command: "storyteller lint --severity error",
      summary: "エラーのみ表示",
    },
    {
      command: "storyteller lint --rule prh,ja-technical-writing",
      summary: "特定ルールのみ有効化",
    },
    {
      command: "storyteller lint --with-entity-check",
      summary: "storytellerエンティティチェックも実行",
    },
  ],
  handler: {
    name: "lint",
    execute: async (context) => {
      const args = context.args as LintCliOptions;
      const options = parseLintOptions(args);

      // プロジェクトルートを取得
      const projectRoot = Deno.cwd();

      // lint実行
      const result = await executeLint(options, projectRoot);

      // 結果出力
      formatLintResult(result, options);

      // エラーがある場合はexit code 1
      if (
        result && !Array.isArray(result) && result.errorCount > 0
      ) {
        return {
          ok: false,
          error: { code: "LINT_ERROR", message: "Lint errors found" },
        };
      }

      return { ok: true, value: result };
    },
  },
};
