// src/lsp/integration/textlint/textlint_worker.ts
import type { TextlintConfig } from "./textlint_config.ts";
import { parseTextlintOutput, type TextlintResult } from "./textlint_parser.ts";

/**
 * TextlintWorkerオプション
 *
 * TextlintWorkerの動作を制御するための設定。
 */
export interface TextlintWorkerOptions {
  /** textlint実行パス（例: "npx textlint"） */
  executablePath: string;

  /** デバウンス時間（ms） */
  debounceMs: number;

  /** タイムアウト時間（ms） */
  timeoutMs: number;

  /** 有効フラグ */
  enabled: boolean;

  /** textlint設定ファイルパス（オプショナル） */
  configPath?: string;
}

/**
 * textlintをバックグラウンドで実行するワーカー
 * デバウンス・キャンセル・タイムアウト対応
 */
export class TextlintWorker {
  private process: Deno.ChildProcess | null = null;
  private debounceTimer: number | null = null;
  private abortController: AbortController | null = null;
  private pendingResolve: ((result: TextlintResult) => void) | null = null;

  constructor(private options: TextlintWorkerOptions) {}

  /**
   * textlintを実行（デバウンス・キャンセル付き）
   *
   * 連続して呼び出された場合、前のリクエストは自動的にキャンセルされます。
   * 設定されたデバウンス時間後に実際の実行が開始されます。
   *
   * @param content チェックする内容
   * @param filePath ファイルパス
   * @returns textlint実行結果
   */
  async lint(content: string, filePath: string): Promise<TextlintResult> {
    // 既存のリクエストをキャンセル
    this.cancel();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      this.debounceTimer = setTimeout(async () => {
        try {
          const result = await this.execute(content, filePath);
          resolve(result);
        } catch (error) {
          if (Deno.env.get("STORYTELLER_DEBUG")) {
            console.error(`[TextlintWorker] Lint execution failed: ${error}`);
          }
          resolve({ filePath, messages: [] });
        } finally {
          this.pendingResolve = null;
        }
      }, this.options.debounceMs);
    });
  }

  /**
   * 実際のtextlint実行
   *
   * stdinを通じて内容をtextlintに渡し、JSON形式で結果を受け取ります。
   * タイムアウトやプロセス失敗時は空の結果を返します。
   *
   * @param content チェックする内容
   * @param filePath ファイルパス
   * @returns textlint実行結果
   * @private
   */
  private async execute(
    content: string,
    filePath: string,
  ): Promise<TextlintResult> {
    this.abortController = new AbortController();

    const args = [
      "textlint",
      "--stdin",
      "--stdin-filename",
      filePath,
      "--format",
      "json",
    ];

    if (this.options.configPath) {
      args.push("--config", this.options.configPath);
    }

    const command = new Deno.Command("npx", {
      args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    this.process = command.spawn();

    // stdinに内容を書き込み
    const writer = this.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();

    // タイムアウト付きで待機
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.options.timeoutMs);

    try {
      const result = await this.process.output();
      clearTimeout(timeoutId);

      if (!result.success) {
        // textlintはエラー時もexit 1を返すが、stdoutにはJSONがある
      }

      const output = new TextDecoder().decode(result.stdout);
      return parseTextlintOutput(output, filePath);
    } catch (error) {
      // タイムアウトまたはその他のエラー
      if (Deno.env.get("STORYTELLER_DEBUG")) {
        console.error(`[TextlintWorker] Process execution failed: ${error}`);
      }

      try {
        this.process.kill("SIGTERM");
      } catch (killError) {
        // プロセスが既に終了している場合は無視
        if (Deno.env.get("STORYTELLER_DEBUG")) {
          console.error(
            `[TextlintWorker] Failed to kill process: ${killError}`,
          );
        }
      }
      return { filePath, messages: [] };
    } finally {
      this.process = null;
      this.abortController = null;
    }
  }

  /**
   * 進行中の操作をキャンセル
   *
   * デバウンスタイマー、実行中のプロセス、保留中のPromiseをすべてクリーンアップします。
   * 複数回呼び出しても安全です。
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.process) {
      try {
        this.process.kill("SIGTERM");
      } catch {
        // プロセスが既に終了
      }
      this.process = null;
    }

    if (this.pendingResolve) {
      this.pendingResolve({ filePath: "", messages: [] });
      this.pendingResolve = null;
    }
  }

  /**
   * リソースを解放
   *
   * すべての進行中の操作をキャンセルし、リソースをクリーンアップします。
   * LSPサーバー終了時に呼び出されます。
   */
  dispose(): void {
    this.cancel();
  }
}
