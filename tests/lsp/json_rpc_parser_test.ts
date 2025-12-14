/**
 * JSON-RPC 2.0 パーサーのテスト
 * TDD Red Phase: このテストは実装がないため最初は失敗する
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

// Process1 Sub1: JSON-RPCメッセージ型定義のテスト
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../src/lsp/protocol/types.ts";

// Process1 Sub2: JSON-RPCパーサー関数のテスト
import {
  JSON_RPC_INVALID_REQUEST,
  JSON_RPC_PARSE_ERROR,
  parseJsonRpc,
  parseJsonRpcBatch,
  serializeJsonRpc,
} from "../../src/lsp/protocol/json_rpc.ts";

describe("JSON-RPC 型定義", () => {
  describe("JsonRpcRequest", () => {
    it("有効なリクエストオブジェクトを作成できる", () => {
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { rootUri: "file:///project" },
      };
      assertEquals(request.jsonrpc, "2.0");
      assertEquals(request.id, 1);
      assertEquals(request.method, "initialize");
      assertExists(request.params);
    });

    it("文字列IDを持つリクエストを作成できる", () => {
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: "uuid-12345",
        method: "test",
      };
      assertEquals(request.id, "uuid-12345");
    });
  });

  describe("JsonRpcNotification", () => {
    it("IDを持たない通知オブジェクトを作成できる", () => {
      const notification: JsonRpcNotification = {
        jsonrpc: "2.0",
        method: "initialized",
      };
      assertEquals(notification.jsonrpc, "2.0");
      assertEquals(notification.method, "initialized");
      assertEquals(notification.id, undefined);
    });
  });

  describe("JsonRpcResponse", () => {
    it("成功レスポンスを作成できる", () => {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: { capabilities: {} },
      };
      assertEquals(response.jsonrpc, "2.0");
      assertEquals(response.id, 1);
      assertExists(response.result);
      assertEquals(response.error, undefined);
    });

    it("エラーレスポンスを作成できる", () => {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      };
      assertEquals(response.jsonrpc, "2.0");
      assertEquals(response.id, 1);
      assertExists(response.error);
      assertEquals(response.error.code, -32600);
    });

    it("nullのIDを持つエラーレスポンスを作成できる", () => {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      };
      assertEquals(response.id, null);
    });
  });

  describe("JsonRpcError", () => {
    it("詳細データ付きエラーを作成できる", () => {
      const error: JsonRpcError = {
        code: -32600,
        message: "Invalid Request",
        data: { detail: "Missing required field" },
      };
      assertEquals(error.code, -32600);
      assertEquals(error.message, "Invalid Request");
      assertExists(error.data);
    });
  });
});

describe("JSON-RPC パーサー", () => {
  describe("parseJsonRpc", () => {
    it("有効なリクエストをパースできる", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { rootUri: "file:///project" },
      });

      const result = parseJsonRpc(input);

      assertEquals(result.ok, true);
      if (result.ok) {
        const message = result.value as JsonRpcRequest;
        assertEquals(message.jsonrpc, "2.0");
        assertEquals(message.id, 1);
        assertEquals(message.method, "initialize");
      }
    });

    it("有効な通知をパースできる", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        method: "initialized",
      });

      const result = parseJsonRpc(input);

      assertEquals(result.ok, true);
      if (result.ok) {
        const message = result.value as JsonRpcNotification;
        assertEquals(message.method, "initialized");
        assertEquals(message.id, undefined);
      }
    });

    it("有効なレスポンスをパースできる", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { capabilities: {} },
      });

      const result = parseJsonRpc(input);

      assertEquals(result.ok, true);
      if (result.ok) {
        const message = result.value as JsonRpcResponse;
        assertEquals(message.id, 1);
        assertExists(message.result);
      }
    });

    it("無効なJSONでパースエラーを返す（code: -32700）", () => {
      const input = "{ invalid json }";

      const result = parseJsonRpc(input);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, JSON_RPC_PARSE_ERROR);
        assertEquals(result.error.code, -32700);
      }
    });

    it("無効なjsonrpcバージョンでエラーを返す（code: -32600）", () => {
      const input = JSON.stringify({
        jsonrpc: "1.0",
        id: 1,
        method: "test",
      });

      const result = parseJsonRpc(input);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, JSON_RPC_INVALID_REQUEST);
        assertEquals(result.error.code, -32600);
      }
    });

    it("jsonrpcフィールドが欠けている場合エラーを返す", () => {
      const input = JSON.stringify({
        id: 1,
        method: "test",
      });

      const result = parseJsonRpc(input);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, JSON_RPC_INVALID_REQUEST);
      }
    });

    it("リクエストでmethodフィールドが欠けている場合エラーを返す", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
      });

      const result = parseJsonRpc(input);

      // method がない場合、id があれば Response として解釈される可能性がある
      // しかし result も error もないのでエラー
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, JSON_RPC_INVALID_REQUEST);
      }
    });
  });

  describe("parseJsonRpcBatch", () => {
    it("バッチリクエストをパースできる", () => {
      const input = JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "method1" },
        { jsonrpc: "2.0", id: 2, method: "method2" },
        { jsonrpc: "2.0", method: "notification" },
      ]);

      const results = parseJsonRpcBatch(input);

      assertEquals(results.length, 3);
      // 各要素がResultとして返される
    });

    it("空の配列でも処理できる", () => {
      const input = JSON.stringify([]);

      const results = parseJsonRpcBatch(input);

      assertEquals(results.length, 0);
    });

    it("配列でない場合は単一メッセージとして処理する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "single",
      });

      const results = parseJsonRpcBatch(input);

      assertEquals(results.length, 1);
    });
  });

  describe("serializeJsonRpc", () => {
    it("リクエストをシリアライズできる", () => {
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { rootUri: "file:///project" },
      };

      const serialized = serializeJsonRpc(request);
      const parsed = JSON.parse(serialized);

      assertEquals(parsed.jsonrpc, "2.0");
      assertEquals(parsed.id, 1);
      assertEquals(parsed.method, "initialize");
    });

    it("レスポンスをシリアライズできる", () => {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: { capabilities: {} },
      };

      const serialized = serializeJsonRpc(response);
      const parsed = JSON.parse(serialized);

      assertEquals(parsed.jsonrpc, "2.0");
      assertEquals(parsed.id, 1);
      assertExists(parsed.result);
    });
  });
});

describe("JSON-RPC エラーコード定数", () => {
  it("パースエラーコードが正しい", () => {
    assertEquals(JSON_RPC_PARSE_ERROR, -32700);
  });

  it("無効リクエストエラーコードが正しい", () => {
    assertEquals(JSON_RPC_INVALID_REQUEST, -32600);
  });
});
