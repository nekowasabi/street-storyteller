/**
 * MCPトランスポート層
 * Content-Lengthベースのメッセージ境界処理を実装
 * LSPトランスポートと同じJSON-RPC over stdioプロトコルを使用
 */

import { err, ok, type Result } from "../../shared/result.ts";
import { parseJsonRpc, serializeJsonRpc } from "../../lsp/protocol/json_rpc.ts";
import type { JsonRpcError, JsonRpcMessage } from "../../lsp/protocol/types.ts";

/** 読み取りエラーコード */
const TRANSPORT_READ_ERROR = -32000;

/** ヘッダーパースエラーコード */
const TRANSPORT_HEADER_ERROR = -32002;

/**
 * Reader インターフェース
 */
export interface TransportReader {
  read(p: Uint8Array): Promise<number | null>;
}

/**
 * Writer インターフェース
 */
export interface TransportWriter {
  write(p: Uint8Array): Promise<number>;
}

/**
 * MCPトランスポートクラス
 * JSON-RPCメッセージをContent-Length形式で読み書きする
 */
export class McpTransport {
  private readonly reader: TransportReader;
  private readonly writer: TransportWriter;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  /** 読み取りバッファ */
  private buffer = new Uint8Array(0);

  /** トランスポートがクローズされたかどうか */
  private closed = false;

  constructor(reader: TransportReader, writer: TransportWriter) {
    this.reader = reader;
    this.writer = writer;
  }

  /**
   * MCPメッセージを読み取る
   * @returns パースされたJSON-RPCメッセージ、またはエラー
   */
  async readMessage(): Promise<Result<JsonRpcMessage, JsonRpcError>> {
    if (this.closed) {
      return err({
        code: TRANSPORT_READ_ERROR,
        message: "Transport is closed",
      });
    }

    try {
      // ヘッダーを読み取る
      const headerResult = await this.readHeaders();
      if (!headerResult.ok) {
        return headerResult;
      }

      const contentLength = headerResult.value;

      // ボディを読み取る
      const bodyResult = await this.readExactBytes(contentLength);
      if (!bodyResult.ok) {
        return bodyResult;
      }

      const bodyStr = this.decoder.decode(bodyResult.value);

      // JSON-RPCとしてパース
      return parseJsonRpc(bodyStr);
    } catch (error) {
      return err({
        code: TRANSPORT_READ_ERROR,
        message: `Read error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * MCPメッセージを書き込む
   * @param message 書き込むJSON-RPCメッセージ
   */
  async writeMessage(message: JsonRpcMessage): Promise<void> {
    if (this.closed) {
      throw new Error("Transport is closed");
    }

    const body = serializeJsonRpc(message);
    const bodyBytes = this.encoder.encode(body);
    const header = `Content-Length: ${bodyBytes.length}\r\n\r\n`;
    const headerBytes = this.encoder.encode(header);

    // ヘッダーとボディを書き込む
    await this.writer.write(headerBytes);
    await this.writer.write(bodyBytes);
  }

  /**
   * 生のバイト列を書き込む
   * @param data 書き込むバイト列
   */
  async writeRaw(data: Uint8Array): Promise<number> {
    if (this.closed) {
      throw new Error("Transport is closed");
    }
    return await this.writer.write(data);
  }

  /**
   * トランスポートを閉じる
   */
  close(): void {
    this.closed = true;
    this.buffer = new Uint8Array(0);
  }

  /**
   * ヘッダーを読み取りContent-Lengthを取得
   */
  private async readHeaders(): Promise<Result<number, JsonRpcError>> {
    const headerEndMarker = this.encoder.encode("\r\n\r\n");
    let contentLength = -1;

    // ヘッダー終端を探す
    while (true) {
      const headerEndIndex = this.findSequence(this.buffer, headerEndMarker);

      if (headerEndIndex !== -1) {
        // ヘッダー部分を取得
        const headerBytes = this.buffer.subarray(0, headerEndIndex);
        const headerStr = this.decoder.decode(headerBytes);

        // ヘッダーをパース
        const parsedLength = this.parseContentLength(headerStr);
        if (parsedLength === null) {
          return err({
            code: TRANSPORT_HEADER_ERROR,
            message: "Invalid header: Content-Length not found",
          });
        }

        contentLength = parsedLength;

        // バッファからヘッダー部分を削除
        this.buffer = this.buffer.subarray(headerEndIndex + headerEndMarker.length);
        break;
      }

      // さらにデータを読み取る
      const readResult = await this.readMoreData();
      if (!readResult) {
        return err({
          code: TRANSPORT_READ_ERROR,
          message: "Unexpected end of stream while reading headers",
        });
      }
    }

    return ok(contentLength);
  }

  /**
   * 指定されたバイト数を正確に読み取る
   */
  private async readExactBytes(length: number): Promise<Result<Uint8Array, JsonRpcError>> {
    while (this.buffer.length < length) {
      const readResult = await this.readMoreData();
      if (!readResult) {
        return err({
          code: TRANSPORT_READ_ERROR,
          message: `Unexpected end of stream: expected ${length} bytes, got ${this.buffer.length}`,
        });
      }
    }

    const result = this.buffer.subarray(0, length);
    this.buffer = this.buffer.subarray(length);
    return ok(new Uint8Array(result));
  }

  /**
   * リーダーからさらにデータを読み取る
   * @returns データが読み取れた場合true、EOFの場合false
   */
  private async readMoreData(): Promise<boolean> {
    const chunk = new Uint8Array(4096);
    const bytesRead = await this.reader.read(chunk);

    if (bytesRead === null || bytesRead === 0) {
      return false;
    }

    // バッファに追加
    const newBuffer = new Uint8Array(this.buffer.length + bytesRead);
    newBuffer.set(this.buffer);
    newBuffer.set(chunk.subarray(0, bytesRead), this.buffer.length);
    this.buffer = newBuffer;

    return true;
  }

  /**
   * バッファ内でシーケンスを検索
   */
  private findSequence(buffer: Uint8Array, sequence: Uint8Array): number {
    outer: for (let i = 0; i <= buffer.length - sequence.length; i++) {
      for (let j = 0; j < sequence.length; j++) {
        if (buffer[i + j] !== sequence[j]) {
          continue outer;
        }
      }
      return i;
    }
    return -1;
  }

  /**
   * ヘッダー文字列からContent-Lengthを抽出
   */
  private parseContentLength(headerStr: string): number | null {
    const lines = headerStr.split("\r\n");

    for (const line of lines) {
      const match = line.match(/^Content-Length:\s*(\d+)$/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }
}
