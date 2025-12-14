/**
 * LSPテスト用ヘルパー関数
 */

/**
 * モックReaderインターフェース
 */
export interface MockReader {
  read(p: Uint8Array): Promise<number | null>;
}

/**
 * モックWriterインターフェース
 */
export interface MockWriter {
  write(p: Uint8Array): Promise<number>;
  getData(): string;
  clear(): void;
}

/**
 * テスト用のモックReaderを作成
 * @param data 読み取るデータ文字列
 * @returns Deno.Reader互換のモックオブジェクト
 */
export function createMockReader(data: string): MockReader {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  let offset = 0;

  return {
    read(p: Uint8Array): Promise<number | null> {
      if (offset >= bytes.length) {
        return Promise.resolve(null);
      }

      const remaining = bytes.length - offset;
      const bytesToRead = Math.min(p.length, remaining);
      p.set(bytes.subarray(offset, offset + bytesToRead));
      offset += bytesToRead;

      return Promise.resolve(bytesToRead);
    },
  };
}

/**
 * テスト用のモックWriterを作成
 * @returns Deno.Writer互換のモックオブジェクトと書き込みデータへのアクセサ
 */
export function createMockWriter(): MockWriter {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];

  return {
    write(p: Uint8Array): Promise<number> {
      const copy = new Uint8Array(p);
      chunks.push(copy);
      return Promise.resolve(p.length);
    },

    getData(): string {
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return decoder.decode(combined);
    },

    clear(): void {
      chunks.length = 0;
    },
  };
}

/**
 * LSPメッセージ形式でデータを作成
 * @param body メッセージ本文
 * @returns Content-Lengthヘッダー付きのLSPメッセージ
 */
export function createLspMessage(body: string): string {
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(body).length;
  return `Content-Length: ${byteLength}\r\n\r\n${body}`;
}

/**
 * 複数のLSPメッセージを結合
 * @param bodies メッセージ本文の配列
 * @returns 結合されたLSPメッセージ
 */
export function createLspMessages(bodies: string[]): string {
  return bodies.map(createLspMessage).join("");
}
