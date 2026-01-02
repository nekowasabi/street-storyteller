/**
 * textlint共通ランナー
 * CLI/MCPで共有するtextlint実行ロジック
 */

import { join } from "@std/path";
import type {
  TextlintCheckOptions,
  TextlintCheckResult,
  TextlintFileResult,
  TextlintFixOptions,
  TextlintFixResult,
  TextlintIssue,
} from "./types.ts";

/**
 * textlintランナー
 * CLI/MCPで共有するロジック
 */
export class TextlintRunner {
  constructor(private readonly projectRoot: string) {}

  /**
   * textlintチェックを実行
   */
  async check(options: TextlintCheckOptions): Promise<TextlintCheckResult> {
    const args = this.buildCheckArgs(options);

    try {
      const result = await this.executeTextlint(args);
      return this.parseCheckResult(result, options);
    } catch (error) {
      // textlintが見つからない、または実行エラー
      console.error("textlint execution failed:", error);
      return this.emptyCheckResult();
    }
  }

  /**
   * textlint修正を実行
   */
  async fix(options: TextlintFixOptions): Promise<TextlintFixResult[]> {
    const args = this.buildFixArgs(options);

    try {
      const result = await this.executeTextlint(args);
      return this.parseFixResult(result, options);
    } catch (error) {
      console.error("textlint fix failed:", error);
      return [];
    }
  }

  /**
   * チェック用引数を構築
   */
  private buildCheckArgs(options: TextlintCheckOptions): string[] {
    const args = ["textlint", "--format", "json"];

    // ルール指定
    if (options.rules && options.rules.length > 0) {
      for (const rule of options.rules) {
        args.push("--rule", rule);
      }
    }

    // 対象パス
    if (options.path) {
      const fullPath = this.resolveRelativePath(options.path);
      args.push(fullPath);
    } else if (options.dir) {
      const fullPath = this.resolveRelativePath(options.dir);
      if (options.recursive) {
        args.push(`${fullPath}/**/*.md`);
      } else {
        args.push(`${fullPath}/*.md`);
      }
    } else {
      // デフォルト: manuscripts/配下を再帰的にチェック
      args.push("manuscripts/**/*.md");
    }

    return args;
  }

  /**
   * 修正用引数を構築
   */
  private buildFixArgs(options: TextlintFixOptions): string[] {
    const args = ["textlint", "--fix", "--format", "json"];

    // ルール指定
    if (options.rules && options.rules.length > 0) {
      for (const rule of options.rules) {
        args.push("--rule", rule);
      }
    }

    // ドライラン
    if (options.dryRun) {
      args.push("--dry-run");
    }

    // 対象ファイル
    const fullPath = this.resolveRelativePath(options.path);
    args.push(fullPath);

    return args;
  }

  /**
   * textlintコマンドを実行
   */
  private async executeTextlint(args: string[]): Promise<string> {
    const command = new Deno.Command("npx", {
      args,
      cwd: this.projectRoot,
      stdout: "piped",
      stderr: "piped",
    });

    const process = command.spawn();
    const { stdout, stderr, success } = await process.output();

    // textlintはエラーがある場合でもexit 1を返すが、stdoutにはJSONが出力される
    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    if (!success && !output) {
      // 実行自体が失敗（textlintが見つからないなど）
      throw new Error(
        `textlint execution failed: ${errorOutput || "Unknown error"}`,
      );
    }

    return output;
  }

  /**
   * チェック結果をパース
   */
  private parseCheckResult(
    output: string,
    options: TextlintCheckOptions,
  ): TextlintCheckResult {
    if (!output || output.trim() === "") {
      return this.emptyCheckResult();
    }

    try {
      const parsed = JSON.parse(output);

      if (!Array.isArray(parsed)) {
        return this.emptyCheckResult();
      }

      const results: TextlintFileResult[] = [];
      let totalIssues = 0;
      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;

      for (const fileResult of parsed) {
        if (!fileResult.filePath || !Array.isArray(fileResult.messages)) {
          continue;
        }

        const issues: TextlintIssue[] = fileResult.messages
          .map((msg: {
            ruleId?: string;
            severity?: number;
            message?: string;
            line?: number;
            column?: number;
          }) => {
            const severity = this.mapSeverity(msg.severity ?? 1);

            // severityフィルタリング
            if (options.severity && severity !== options.severity) {
              return null;
            }

            return {
              ruleId: msg.ruleId ?? "unknown",
              severity,
              message: msg.message ?? "",
              line: msg.line ?? 1,
              column: msg.column ?? 1,
              source: "textlint" as const,
            };
          })
          .filter((
            issue: {
              ruleId: string;
              severity: "error" | "warning" | "info";
              message: string;
              line: number;
              column: number;
              source: "textlint";
            } | null,
          ): issue is TextlintIssue => issue !== null);

        if (issues.length > 0) {
          results.push({
            path: fileResult.filePath,
            issues,
          });

          totalIssues += issues.length;
          for (const issue of issues) {
            if (issue.severity === "error") errorCount++;
            else if (issue.severity === "warning") warningCount++;
            else if (issue.severity === "info") infoCount++;
          }
        }
      }

      return {
        totalFiles: results.length,
        totalIssues,
        errorCount,
        warningCount,
        infoCount,
        results,
      };
    } catch {
      return this.emptyCheckResult();
    }
  }

  /**
   * 修正結果をパース
   */
  private parseFixResult(
    output: string,
    options: TextlintFixOptions,
  ): TextlintFixResult[] {
    if (!output || output.trim() === "") {
      return [];
    }

    try {
      const parsed = JSON.parse(output);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((fileResult) => ({
        fixed: fileResult.messages?.length > 0 || false,
        path: fileResult.filePath || options.path,
        fixedCount: fileResult.messages?.length || 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * textlint severity → 文字列severityマッピング
   */
  private mapSeverity(textlintSeverity: number): "error" | "warning" | "info" {
    switch (textlintSeverity) {
      case 2:
        return "error";
      case 1:
        return "warning";
      default:
        return "info";
    }
  }

  /**
   * 相対パスを絶対パスに解決
   */
  private resolveRelativePath(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }
    return join(this.projectRoot, path);
  }

  /**
   * 空のチェック結果を返す
   */
  private emptyCheckResult(): TextlintCheckResult {
    return {
      totalFiles: 0,
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      results: [],
    };
  }
}
