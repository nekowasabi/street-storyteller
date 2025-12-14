/**
 * JSON-RPC 2.0 メッセージ型定義
 * @see https://www.jsonrpc.org/specification
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/
 */

/**
 * JSON-RPC 2.0 エラーオブジェクト
 */
export type JsonRpcError = {
  /** エラーコード */
  readonly code: number;
  /** エラーメッセージ */
  readonly message: string;
  /** 追加のエラーデータ（オプション） */
  readonly data?: unknown;
};

/**
 * JSON-RPC 2.0 リクエストオブジェクト
 * method を持つメッセージで、id がある場合はリクエスト（レスポンスが期待される）
 */
export type JsonRpcRequest = {
  /** JSON-RPCバージョン（常に "2.0"） */
  readonly jsonrpc: "2.0";
  /** リクエストID（数値または文字列） */
  readonly id: number | string;
  /** 呼び出すメソッド名 */
  readonly method: string;
  /** メソッドパラメータ（オプション） */
  readonly params?: unknown;
};

/**
 * JSON-RPC 2.0 通知オブジェクト
 * method を持つメッセージで、id がない場合は通知（レスポンスは期待されない）
 */
export type JsonRpcNotification = {
  /** JSON-RPCバージョン（常に "2.0"） */
  readonly jsonrpc: "2.0";
  /** IDは存在しない */
  readonly id?: undefined;
  /** 呼び出すメソッド名 */
  readonly method: string;
  /** メソッドパラメータ（オプション） */
  readonly params?: unknown;
};

/**
 * JSON-RPC 2.0 レスポンスオブジェクト
 * リクエストに対する応答。result または error のいずれかを含む
 */
export type JsonRpcResponse = {
  /** JSON-RPCバージョン（常に "2.0"） */
  readonly jsonrpc: "2.0";
  /** リクエストに対応するID（パースエラーの場合は null） */
  readonly id: number | string | null;
  /** 成功時の結果（オプション） */
  readonly result?: unknown;
  /** エラー時のエラーオブジェクト（オプション） */
  readonly error?: JsonRpcError;
};

/**
 * JSON-RPC 2.0 メッセージの共用体型
 * リクエスト、通知、レスポンスのいずれか
 */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

/**
 * メッセージがリクエストかどうかを判定するType Guard
 */
export function isJsonRpcRequest(message: JsonRpcMessage): message is JsonRpcRequest {
  return "method" in message && "id" in message && message.id !== undefined;
}

/**
 * メッセージが通知かどうかを判定するType Guard
 */
export function isJsonRpcNotification(message: JsonRpcMessage): message is JsonRpcNotification {
  return "method" in message && (!("id" in message) || message.id === undefined);
}

/**
 * メッセージがレスポンスかどうかを判定するType Guard
 */
export function isJsonRpcResponse(message: JsonRpcMessage): message is JsonRpcResponse {
  return !("method" in message) && "id" in message;
}
