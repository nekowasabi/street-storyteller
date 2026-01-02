// src/lsp/integration/textlint/textlint_diagnostic_source.ts
import type {
  Diagnostic,
  DiagnosticSeverityType,
} from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";
import { TextlintWorker } from "./textlint_worker.ts";
import { detectTextlintConfig } from "./textlint_config.ts";
import { DiagnosticSeverity } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";

/**
 * textlint診断ソース
 *
 * DiagnosticSourceインターフェースを実装し、textlintの文法チェック結果を
 * LSP診断に変換してstoryteller LSPに統合します。
 *
 * @example
 * ```typescript
 * const source = new TextlintDiagnosticSource("/path/to/project");
 * const diagnostics = await source.generate("file:///test.md", content, "/project");
 * ```
 */
export class TextlintDiagnosticSource implements DiagnosticSource {
  readonly name = "textlint";

  private worker: TextlintWorker | null = null;
  private available: boolean | null = null;
  private availabilityChecked = false;

  constructor(private projectRoot: string) {}

  /**
   * textlintが利用可能かチェック
   *
   * `npx textlint --version` を実行してtextlintの存在を確認します。
   * 結果はキャッシュされ、2回目以降は即座に返されます。
   *
   * @returns textlintが利用可能な場合はtrue
   */
  async isAvailable(): Promise<boolean> {
    if (this.availabilityChecked) {
      return this.available ?? false;
    }

    try {
      const command = new Deno.Command("npx", {
        args: ["textlint", "--version"],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await command.output();
      this.available = result.success;

      if (!result.success && Deno.env.get("STORYTELLER_DEBUG")) {
        const stderr = new TextDecoder().decode(result.stderr);
        console.error(
          `[TextlintDiagnosticSource] textlint --version failed:\n${stderr}`,
        );
      }
    } catch (error) {
      this.available = false;

      if (Deno.env.get("STORYTELLER_DEBUG")) {
        console.error(
          `[TextlintDiagnosticSource] Failed to check textlint availability: ${error}`,
        );
      }
    }

    this.availabilityChecked = true;

    if (this.available) {
      // ワーカーを初期化
      const config = await detectTextlintConfig(this.projectRoot);
      this.worker = new TextlintWorker({
        executablePath: config.executablePath,
        debounceMs: config.debounceMs,
        timeoutMs: config.timeoutMs,
        enabled: config.enabled,
        configPath: config.configPath,
      });
    }

    return this.available ?? false;
  }

  /**
   * 診断を生成
   *
   * TextlintWorkerを使用してtextlintを実行し、結果をLSP診断形式に変換します。
   * textlintが利用不可の場合、またはエラー時は空配列を返します。
   *
   * @param uri ドキュメントURI (file://...)
   * @param content ドキュメントの内容
   * @param _projectRoot プロジェクトルート（未使用）
   * @returns LSP診断の配列
   */
  async generate(
    uri: string,
    content: string,
    _projectRoot: string,
  ): Promise<Diagnostic[]> {
    if (!this.worker) {
      return [];
    }

    // URIからファイルパスを抽出
    const filePath = uri.startsWith("file://")
      ? decodeURIComponent(uri.slice(7))
      : uri;

    const result = await this.worker.lint(content, filePath);

    // TextlintMessage → Diagnosticに変換
    return result.messages.map((msg) => ({
      range: {
        start: { line: msg.line - 1, character: msg.column - 1 },
        end: { line: msg.line - 1, character: msg.column },
      },
      message: msg.message,
      severity: this.mapSeverity(msg.severity),
      source: "textlint",
      code: msg.ruleId,
    }));
  }

  /**
   * textlint severity → LSP severityマッピング
   *
   * textlintの重要度をLSP DiagnosticSeverityに変換します：
   * - 2 (error) → DiagnosticSeverity.Error (1)
   * - 1 (warning) → DiagnosticSeverity.Warning (2)
   * - 0 (info) → DiagnosticSeverity.Information (3)
   *
   * @param textlintSeverity textlintの重要度 (0-2)
   * @returns LSP DiagnosticSeverity (1-4)
   */
  private mapSeverity(textlintSeverity: number): DiagnosticSeverityType {
    switch (textlintSeverity) {
      case 2:
        return DiagnosticSeverity.Error; // 1
      case 1:
        return DiagnosticSeverity.Warning; // 2
      default:
        return DiagnosticSeverity.Information; // 3
    }
  }

  /**
   * 進行中のtextlint操作をキャンセル
   *
   * デバウンス中またはtextlint実行中の操作をキャンセルします。
   */
  cancel(): void {
    this.worker?.cancel();
  }

  /**
   * リソースを解放
   *
   * ワーカーを破棄し、全リソースをクリーンアップします。
   * LSPサーバー終了時に呼び出されます。
   */
  dispose(): void {
    this.worker?.dispose();
    this.worker = null;
  }
}
