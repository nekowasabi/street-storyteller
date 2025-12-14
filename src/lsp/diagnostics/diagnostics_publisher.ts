/**
 * 診断発行クラス
 * LSPのpublishDiagnostics通知を送信する
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_publishDiagnostics
 */

import type { Diagnostic } from "./diagnostics_generator.ts";

/**
 * Writer インターフェース
 */
export interface DiagnosticsWriter {
  write(p: Uint8Array): Promise<number>;
}

/**
 * DiagnosticsPublisherオプション
 */
export type DiagnosticsPublisherOptions = {
  /** デバウンス時間（ミリ秒） */
  debounceMs?: number;
};

/**
 * publishDiagnostics通知のパラメータ
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#publishDiagnosticsParams
 */
type PublishDiagnosticsParams = {
  uri: string;
  diagnostics: Diagnostic[];
};

/**
 * JSON-RPC 2.0 通知形式
 */
type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params: unknown;
};

/**
 * 診断発行クラス
 */
export class DiagnosticsPublisher {
  private readonly writer: DiagnosticsWriter;
  private readonly debounceMs: number;
  private readonly encoder = new TextEncoder();

  /** URI毎のデバウンスタイマー */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** URI毎の保留中の診断 */
  private readonly pendingDiagnostics = new Map<string, Diagnostic[]>();

  constructor(writer: DiagnosticsWriter, options?: DiagnosticsPublisherOptions) {
    this.writer = writer;
    this.debounceMs = options?.debounceMs ?? 0;
  }

  /**
   * 診断を即座に発行
   * @param uri ドキュメントURI
   * @param diagnostics 診断の配列
   */
  async publish(uri: string, diagnostics: Diagnostic[]): Promise<void> {
    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri,
        diagnostics,
      } as PublishDiagnosticsParams,
    };

    const body = JSON.stringify(notification);
    const bodyBytes = this.encoder.encode(body);
    const header = `Content-Length: ${bodyBytes.length}\r\n\r\n`;
    const headerBytes = this.encoder.encode(header);

    await this.writer.write(headerBytes);
    await this.writer.write(bodyBytes);
  }

  /**
   * デバウンス付きで診断を発行
   * 同じURIに対する連続した呼び出しは、最後の呼び出しのみが実行される
   * @param uri ドキュメントURI
   * @param diagnostics 診断の配列
   */
  publishDebounced(uri: string, diagnostics: Diagnostic[]): void {
    // 既存のタイマーをキャンセル
    const existingTimer = this.timers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 診断を保存
    this.pendingDiagnostics.set(uri, diagnostics);

    // 新しいタイマーを設定
    const timer = setTimeout(() => {
      const pending = this.pendingDiagnostics.get(uri);
      if (pending !== undefined) {
        this.publish(uri, pending);
        this.pendingDiagnostics.delete(uri);
      }
      this.timers.delete(uri);
    }, this.debounceMs);

    this.timers.set(uri, timer);
  }

  /**
   * 指定URIの保留中の発行をキャンセル
   * @param uri ドキュメントURI
   */
  cancel(uri: string): void {
    const timer = this.timers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(uri);
    }
    this.pendingDiagnostics.delete(uri);
  }

  /**
   * 全ての保留中の発行をキャンセルし、リソースを解放
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingDiagnostics.clear();
  }
}
