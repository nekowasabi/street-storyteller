/**
 * LSPトランスポートのテスト
 * TDD Red Phase: このテストは実装がないため最初は失敗する
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// Process2 Sub1: モックReader/Writerのテスト
import { createMockReader, createMockWriter } from "./helpers.ts";

// Process2 Sub2: LspTransportクラスのテスト
import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";

import type { JsonRpcRequest } from "@storyteller/lsp/protocol/types.ts";

describe("モックReader/Writer", () => {
  describe("createMockReader", () => {
    it("指定されたデータを読み取れる", async () => {
      const testData = "Hello, World!";
      const reader = createMockReader(testData);
      const buffer = new Uint8Array(20);

      const bytesRead = await reader.read(buffer);

      assertExists(bytesRead);
      assertEquals(bytesRead, testData.length);
      const result = new TextDecoder().decode(buffer.subarray(0, bytesRead));
      assertEquals(result, testData);
    });

    it("データを全て読み終わるとnullを返す", async () => {
      const testData = "Short";
      const reader = createMockReader(testData);
      const buffer = new Uint8Array(100);

      // 最初の読み取り
      await reader.read(buffer);

      // 2回目の読み取り - データがないのでnull
      const bytesRead = await reader.read(buffer);
      assertEquals(bytesRead, null);
    });

    it("空のデータの場合は最初からnullを返す", async () => {
      const reader = createMockReader("");
      const buffer = new Uint8Array(10);

      const bytesRead = await reader.read(buffer);
      assertEquals(bytesRead, null);
    });
  });

  describe("createMockWriter", () => {
    it("データを書き込める", async () => {
      const writer = createMockWriter();
      const testData = "Hello, World!";
      const encoded = new TextEncoder().encode(testData);

      const bytesWritten = await writer.write(encoded);

      assertEquals(bytesWritten, encoded.length);
      assertEquals(writer.getData(), testData);
    });

    it("複数回の書き込みが蓄積される", async () => {
      const writer = createMockWriter();

      await writer.write(new TextEncoder().encode("Hello"));
      await writer.write(new TextEncoder().encode(", "));
      await writer.write(new TextEncoder().encode("World!"));

      assertEquals(writer.getData(), "Hello, World!");
    });

    it("clear()で書き込みデータをクリアできる", async () => {
      const writer = createMockWriter();
      await writer.write(new TextEncoder().encode("Test"));

      writer.clear();

      assertEquals(writer.getData(), "");
    });
  });
});

describe("LspTransport", () => {
  describe("readMessage", () => {
    it("Content-Lengthヘッダーを正しく読み取れる", async () => {
      const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      };
      const body = JSON.stringify(message);
      const lspMessage = `Content-Length: ${body.length}\r\n\r\n${body}`;

      const reader = createMockReader(lspMessage);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result = await transport.readMessage();

      assertEquals(result.ok, true);
      if (result.ok) {
        const parsedMessage = result.value as JsonRpcRequest;
        assertEquals(parsedMessage.jsonrpc, "2.0");
        assertEquals(parsedMessage.id, 1);
        assertEquals(parsedMessage.method, "initialize");
      }
    });

    it("マルチバイト文字を含むメッセージを正しく読み取れる", async () => {
      const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        params: { text: "日本語テスト" },
      };
      const body = JSON.stringify(message);
      const bodyBytes = new TextEncoder().encode(body);
      const lspMessage = `Content-Length: ${bodyBytes.length}\r\n\r\n${body}`;

      const reader = createMockReader(lspMessage);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result = await transport.readMessage();

      assertEquals(result.ok, true);
      if (result.ok) {
        const parsedMessage = result.value as JsonRpcRequest;
        assertEquals(
          (parsedMessage.params as { text: string }).text,
          "日本語テスト",
        );
      }
    });

    it("複数のメッセージを順番に読み取れる", async () => {
      const message1: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "first",
      };
      const message2: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "second",
      };

      const body1 = JSON.stringify(message1);
      const body2 = JSON.stringify(message2);
      const lspData = `Content-Length: ${body1.length}\r\n\r\n${body1}` +
        `Content-Length: ${body2.length}\r\n\r\n${body2}`;

      const reader = createMockReader(lspData);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result1 = await transport.readMessage();
      assertEquals(result1.ok, true);
      if (result1.ok) {
        assertEquals((result1.value as JsonRpcRequest).method, "first");
      }

      const result2 = await transport.readMessage();
      assertEquals(result2.ok, true);
      if (result2.ok) {
        assertEquals((result2.value as JsonRpcRequest).method, "second");
      }
    });

    it("Content-Type ヘッダーがあっても正しく読み取れる", async () => {
      const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
      };
      const body = JSON.stringify(message);
      const lspMessage = `Content-Length: ${body.length}\r\n` +
        `Content-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n${body}`;

      const reader = createMockReader(lspMessage);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result = await transport.readMessage();

      assertEquals(result.ok, true);
    });

    it("データが途中で終わった場合エラーを返す", async () => {
      // Content-Lengthは100だが、実際のボディは10バイトしかない
      const partialMessage = `Content-Length: 100\r\n\r\n{"jsonrpc`;

      const reader = createMockReader(partialMessage);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result = await transport.readMessage();

      assertEquals(result.ok, false);
    });

    it("無効なヘッダー形式でエラーを返す", async () => {
      const invalidMessage = `Invalid-Header\r\n\r\n{}`;

      const reader = createMockReader(invalidMessage);
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const result = await transport.readMessage();

      assertEquals(result.ok, false);
    });
  });

  describe("writeMessage", () => {
    it("Content-Lengthヘッダー付きでメッセージを書き込める", async () => {
      const reader = createMockReader("");
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
      };

      await transport.writeMessage(message);

      const output = writer.getData();
      const expectedBody = JSON.stringify(message);
      const expectedLength = new TextEncoder().encode(expectedBody).length;

      assertEquals(output.startsWith("Content-Length: "), true);
      assertEquals(output.includes(`Content-Length: ${expectedLength}`), true);
      assertEquals(output.includes("\r\n\r\n"), true);
      assertEquals(output.includes(expectedBody), true);
    });

    it("マルチバイト文字を含むメッセージを正しく書き込める", async () => {
      const reader = createMockReader("");
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        params: { text: "日本語テスト" },
      };

      await transport.writeMessage(message);

      const output = writer.getData();
      const expectedBody = JSON.stringify(message);
      const expectedLength = new TextEncoder().encode(expectedBody).length;

      // UTF-8エンコードされたバイト数がContent-Lengthになっているべき
      assertEquals(output.includes(`Content-Length: ${expectedLength}`), true);
      assertEquals(output.includes("日本語テスト"), true);
    });
  });

  describe("close", () => {
    it("正常に閉じることができる", () => {
      const reader = createMockReader("");
      const writer = createMockWriter();
      const transport = new LspTransport(reader, writer);

      // closeがエラーなく呼べることを確認
      transport.close();
    });
  });
});
