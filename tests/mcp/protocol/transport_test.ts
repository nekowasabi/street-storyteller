/**
 * MCPトランスポート層のテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { McpTransport } from "../../../src/mcp/protocol/transport.ts";

/**
 * テスト用のモックReader
 */
class MockReader {
  private data: Uint8Array;
  private position = 0;

  constructor(data: string) {
    this.data = new TextEncoder().encode(data);
  }

  async read(p: Uint8Array): Promise<number | null> {
    if (this.position >= this.data.length) {
      return null;
    }
    const bytesToRead = Math.min(p.length, this.data.length - this.position);
    p.set(this.data.subarray(this.position, this.position + bytesToRead));
    this.position += bytesToRead;
    return bytesToRead;
  }
}

/**
 * テスト用のモックWriter
 */
class MockWriter {
  private chunks: Uint8Array[] = [];

  async write(p: Uint8Array): Promise<number> {
    this.chunks.push(new Uint8Array(p));
    return p.length;
  }

  getOutput(): string {
    const totalLength = this.chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(result);
  }
}

Deno.test("McpTransport: readMessageがJSON-RPCメッセージを正しく読み取る", async () => {
  const message = { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };
  const body = JSON.stringify(message);
  const data = `Content-Length: ${
    new TextEncoder().encode(body).length
  }\r\n\r\n${body}`;

  const reader = new MockReader(data);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const result = await transport.readMessage();

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.jsonrpc, "2.0");
    assertEquals((result.value as { id: number }).id, 1);
    assertEquals((result.value as { method: string }).method, "initialize");
  }
});

Deno.test("McpTransport: writeMessageがContent-Length形式で正しく書き込む", async () => {
  const reader = new MockReader("");
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const message = {
    jsonrpc: "2.0" as const,
    id: 1,
    result: { protocolVersion: "2024-11-05" },
  };

  await transport.writeMessage(message);

  const output = writer.getOutput();
  const body = JSON.stringify(message);
  const expectedLength = new TextEncoder().encode(body).length;

  assertEquals(
    output.startsWith(`Content-Length: ${expectedLength}\r\n\r\n`),
    true,
  );
  assertEquals(output.includes(body), true);
});

Deno.test("McpTransport: 不正なJSONでエラーを返す", async () => {
  const invalidJson = "{ invalid json }";
  const data = `Content-Length: ${
    new TextEncoder().encode(invalidJson).length
  }\r\n\r\n${invalidJson}`;

  const reader = new MockReader(data);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const result = await transport.readMessage();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, -32700); // Parse error
  }
});

Deno.test("McpTransport: 複数メッセージを順次読み取れる", async () => {
  const message1 = { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };
  const message2 = { jsonrpc: "2.0", method: "initialized" };
  const body1 = JSON.stringify(message1);
  const body2 = JSON.stringify(message2);
  const data =
    `Content-Length: ${
      new TextEncoder().encode(body1).length
    }\r\n\r\n${body1}` +
    `Content-Length: ${new TextEncoder().encode(body2).length}\r\n\r\n${body2}`;

  const reader = new MockReader(data);
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  const result1 = await transport.readMessage();
  assertEquals(result1.ok, true);
  if (result1.ok) {
    assertEquals((result1.value as { id: number }).id, 1);
  }

  const result2 = await transport.readMessage();
  assertEquals(result2.ok, true);
  if (result2.ok) {
    assertEquals((result2.value as { method: string }).method, "initialized");
  }
});

Deno.test("McpTransport: closeがトランスポートを閉じる", async () => {
  const reader = new MockReader("");
  const writer = new MockWriter();
  const transport = new McpTransport(reader, writer);

  transport.close();

  const result = await transport.readMessage();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message, "Transport is closed");
  }
});
