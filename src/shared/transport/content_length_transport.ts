/**
 * Content-Length based JSON-RPC transport (shared)
 * LSP/MCPが共通で使用する Content-Length 形式の読み書きを提供する
 */

import { err, ok, type Result } from "@storyteller/shared/result.ts";
import type {
  JsonRpcError,
  JsonRpcMessage,
} from "@storyteller/lsp/protocol/types.ts";

/** 読み取りエラーコード */
const TRANSPORT_READ_ERROR = -32000;

/** ヘッダーパースエラーコード */
const TRANSPORT_HEADER_ERROR = -32002;

export interface TransportReader {
  read(p: Uint8Array): Promise<number | null>;
}

export interface TransportWriter {
  write(p: Uint8Array): Promise<number>;
}

export type JsonRpcParser = (
  text: string,
) => Result<JsonRpcMessage, JsonRpcError>;
export type JsonRpcSerializer = (message: JsonRpcMessage) => string;

export class ContentLengthTransport {
  private readonly reader: TransportReader;
  private readonly writer: TransportWriter;
  private readonly parse: JsonRpcParser;
  private readonly serialize: JsonRpcSerializer;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  /** 読み取りバッファ */
  private buffer = new Uint8Array(0);

  /** トランスポートがクローズされたかどうか */
  private closed = false;

  constructor(
    reader: TransportReader,
    writer: TransportWriter,
    parse: JsonRpcParser,
    serialize: JsonRpcSerializer,
  ) {
    this.reader = reader;
    this.writer = writer;
    this.parse = parse;
    this.serialize = serialize;
  }

  async readMessage(): Promise<Result<JsonRpcMessage, JsonRpcError>> {
    if (this.closed) {
      return err({
        code: TRANSPORT_READ_ERROR,
        message: "Transport is closed",
      });
    }

    try {
      const headerResult = await this.readHeaders();
      if (!headerResult.ok) {
        return headerResult;
      }

      const contentLength = headerResult.value;
      const bodyResult = await this.readExactBytes(contentLength);
      if (!bodyResult.ok) {
        return bodyResult;
      }

      const bodyStr = this.decoder.decode(bodyResult.value);
      return this.parse(bodyStr);
    } catch (error) {
      return err({
        code: TRANSPORT_READ_ERROR,
        message: `Read error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }

  async writeMessage(message: JsonRpcMessage): Promise<void> {
    if (this.closed) {
      throw new Error("Transport is closed");
    }

    const body = this.serialize(message);
    const bodyBytes = this.encoder.encode(body);
    const header = `Content-Length: ${bodyBytes.length}\r\n\r\n`;
    const headerBytes = this.encoder.encode(header);

    await this.writer.write(headerBytes);
    await this.writer.write(bodyBytes);
  }

  async writeRaw(data: Uint8Array): Promise<number> {
    if (this.closed) {
      throw new Error("Transport is closed");
    }
    return await this.writer.write(data);
  }

  close(): void {
    this.closed = true;
    this.buffer = new Uint8Array(0);
  }

  private async readHeaders(): Promise<Result<number, JsonRpcError>> {
    const headerEndMarker = this.encoder.encode("\r\n\r\n");

    while (true) {
      const headerEndIndex = this.findSequence(this.buffer, headerEndMarker);
      if (headerEndIndex !== -1) {
        const headerBytes = this.buffer.subarray(0, headerEndIndex);
        const headerStr = this.decoder.decode(headerBytes);

        const parsedLength = this.parseContentLength(headerStr);
        if (parsedLength === null) {
          return err({
            code: TRANSPORT_HEADER_ERROR,
            message: "Invalid header: Content-Length not found",
          });
        }

        this.buffer = this.buffer.subarray(
          headerEndIndex + headerEndMarker.length,
        );
        return ok(parsedLength);
      }

      const readResult = await this.readMoreData();
      if (!readResult) {
        return err({
          code: TRANSPORT_READ_ERROR,
          message: "Unexpected end of stream while reading headers",
        });
      }
    }
  }

  private async readExactBytes(
    length: number,
  ): Promise<Result<Uint8Array, JsonRpcError>> {
    while (this.buffer.length < length) {
      const readResult = await this.readMoreData();
      if (!readResult) {
        return err({
          code: TRANSPORT_READ_ERROR,
          message:
            `Unexpected end of stream: expected ${length} bytes, got ${this.buffer.length}`,
        });
      }
    }

    const result = this.buffer.subarray(0, length);
    this.buffer = this.buffer.subarray(length);
    return ok(new Uint8Array(result));
  }

  private async readMoreData(): Promise<boolean> {
    const chunk = new Uint8Array(4096);
    const bytesRead = await this.reader.read(chunk);

    if (bytesRead === null || bytesRead === 0) {
      return false;
    }

    const newBuffer = new Uint8Array(this.buffer.length + bytesRead);
    newBuffer.set(this.buffer);
    newBuffer.set(chunk.subarray(0, bytesRead), this.buffer.length);
    this.buffer = newBuffer;

    return true;
  }

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
