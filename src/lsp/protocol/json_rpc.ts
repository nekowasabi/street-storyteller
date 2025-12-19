/**
 * JSON-RPC 2.0 パーサー・シリアライザー
 * @see https://www.jsonrpc.org/specification
 */

import { err, ok, type Result } from "@storyteller/shared/result.ts";
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@storyteller/lsp/protocol/types.ts";

// ===== JSON-RPC 2.0 エラーコード定数 =====

/** パースエラー: 無効なJSONを受信 */
export const JSON_RPC_PARSE_ERROR = -32700;

/** 無効なリクエスト: JSON-RPC仕様に準拠していない */
export const JSON_RPC_INVALID_REQUEST = -32600;

/** メソッドが見つからない */
export const JSON_RPC_METHOD_NOT_FOUND = -32601;

/** 無効なパラメータ */
export const JSON_RPC_INVALID_PARAMS = -32602;

/** 内部エラー */
export const JSON_RPC_INTERNAL_ERROR = -32603;

// ===== パーサー関数 =====

/**
 * JSON-RPC 2.0 メッセージをパースする
 * @param input JSON文字列
 * @returns パース結果のResult。成功時はJsonRpcMessage、失敗時はJsonRpcError
 */
export function parseJsonRpc(
  input: string,
): Result<JsonRpcMessage, JsonRpcError> {
  // JSON パース
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return err({
      code: JSON_RPC_PARSE_ERROR,
      message: "Parse error: Invalid JSON was received",
    });
  }

  return validateJsonRpcMessage(parsed);
}

/**
 * バッチリクエストをパースする
 * @param input JSON文字列（配列またはオブジェクト）
 * @returns 各メッセージのパース結果の配列
 */
export function parseJsonRpcBatch(
  input: string,
): Result<JsonRpcMessage, JsonRpcError>[] {
  // JSON パース
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return [
      err({
        code: JSON_RPC_PARSE_ERROR,
        message: "Parse error: Invalid JSON was received",
      }),
    ];
  }

  // 配列でない場合は単一メッセージとして処理
  if (!Array.isArray(parsed)) {
    return [validateJsonRpcMessage(parsed)];
  }

  // 空の配列
  if (parsed.length === 0) {
    return [];
  }

  // 各要素を検証
  return parsed.map((item) => validateJsonRpcMessage(item));
}

/**
 * JSON-RPC メッセージをシリアライズする
 * @param message JSON-RPCメッセージ
 * @returns JSON文字列
 */
export function serializeJsonRpc(message: JsonRpcMessage): string {
  return JSON.stringify(message);
}

/**
 * 複数のJSON-RPC メッセージをバッチとしてシリアライズする
 * @param messages JSON-RPCメッセージの配列
 * @returns JSON文字列
 */
export function serializeJsonRpcBatch(messages: JsonRpcMessage[]): string {
  return JSON.stringify(messages);
}

// ===== 内部ヘルパー関数 =====

/**
 * パースされたオブジェクトがJSON-RPC 2.0メッセージとして有効かを検証
 */
function validateJsonRpcMessage(
  parsed: unknown,
): Result<JsonRpcMessage, JsonRpcError> {
  // オブジェクトかどうかチェック
  if (typeof parsed !== "object" || parsed === null) {
    return err({
      code: JSON_RPC_INVALID_REQUEST,
      message: "Invalid Request: Expected an object",
    });
  }

  const obj = parsed as Record<string, unknown>;

  // jsonrpc フィールドの検証
  if (!("jsonrpc" in obj) || obj.jsonrpc !== "2.0") {
    return err({
      code: JSON_RPC_INVALID_REQUEST,
      message: 'Invalid Request: jsonrpc field must be "2.0"',
    });
  }

  // method があるかどうかで分岐
  const hasMethod = "method" in obj && typeof obj.method === "string";
  const hasId = "id" in obj;
  const hasResult = "result" in obj;
  const hasError = "error" in obj;

  // リクエストまたは通知
  if (hasMethod) {
    if (hasId && obj.id !== undefined) {
      // リクエスト
      return ok({
        jsonrpc: "2.0",
        id: obj.id as number | string,
        method: obj.method as string,
        params: obj.params,
      } as JsonRpcRequest);
    } else {
      // 通知
      return ok({
        jsonrpc: "2.0",
        method: obj.method as string,
        params: obj.params,
      } as JsonRpcNotification);
    }
  }

  // レスポンス
  if (hasId && (hasResult || hasError)) {
    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: obj.id as number | string | null,
    };

    if (hasResult) {
      return ok({
        ...response,
        result: obj.result,
      } as JsonRpcResponse);
    }

    if (hasError) {
      const error = obj.error as JsonRpcError;
      return ok({
        ...response,
        error,
      } as JsonRpcResponse);
    }

    return ok(response);
  }

  // どのパターンにも該当しない
  return err({
    code: JSON_RPC_INVALID_REQUEST,
    message:
      "Invalid Request: Message does not match any valid JSON-RPC 2.0 format",
  });
}

// ===== エラーレスポンス生成ヘルパー =====

/**
 * エラーレスポンスを生成する
 */
export function createErrorResponse(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

/**
 * 成功レスポンスを生成する
 */
export function createSuccessResponse(
  id: number | string,
  result: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}
