/**
 * MCP (Model Context Protocol) 型定義
 * @see https://spec.modelcontextprotocol.io/specification/
 */

import type {
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
} from "../../lsp/protocol/types.ts";

// ===== MCP エラーコード =====

/**
 * MCP固有のエラーコード
 * JSON-RPC 2.0の標準エラーコードを再エクスポート + MCP固有を追加
 */
export const MCP_ERROR_CODES = {
  /** パースエラー */
  PARSE_ERROR: -32700,
  /** 無効なリクエスト */
  INVALID_REQUEST: -32600,
  /** メソッドが見つからない */
  METHOD_NOT_FOUND: -32601,
  /** 無効なパラメータ */
  INVALID_PARAMS: -32602,
  /** 内部エラー */
  INTERNAL_ERROR: -32603,
} as const;

// ===== MCPツール関連の型 =====

/**
 * JSON Schema 形式の入力スキーマ
 */
export type McpInputSchema = {
  readonly type: "object";
  readonly properties?: Record<string, McpPropertySchema>;
  readonly required?: readonly string[];
};

/**
 * プロパティスキーマ
 */
export type McpPropertySchema = {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description?: string;
  readonly default?: unknown;
  readonly items?: McpPropertySchema;
  readonly enum?: readonly string[];
};

/**
 * MCPツール定義
 */
export type McpTool = {
  /** ツール名（一意識別子） */
  readonly name: string;
  /** ツールの説明 */
  readonly description?: string;
  /** 入力パラメータのJSONスキーマ */
  readonly inputSchema: McpInputSchema;
};

/**
 * ツール呼び出しパラメータ
 */
export type McpCallToolParams = {
  /** 呼び出すツール名 */
  readonly name: string;
  /** ツールに渡す引数 */
  readonly arguments?: Record<string, unknown>;
};

/**
 * ツール呼び出し結果のコンテンツ
 */
export type McpToolResultContent = {
  readonly type: "text";
  readonly text: string;
} | {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
} | {
  readonly type: "resource";
  readonly resource: McpResource;
};

/**
 * ツール呼び出し結果
 */
export type McpCallToolResult = {
  /** 結果コンテンツの配列 */
  readonly content: readonly McpToolResultContent[];
  /** エラーが発生したかどうか */
  readonly isError?: boolean;
};

/**
 * ツール一覧取得結果
 */
export type McpListToolsResult = {
  /** 利用可能なツールの一覧 */
  readonly tools: readonly McpTool[];
};

// ===== MCPリソース関連の型 =====

/**
 * MCPリソース定義
 */
export type McpResource = {
  /** リソースURI */
  readonly uri: string;
  /** リソース名 */
  readonly name: string;
  /** MIMEタイプ */
  readonly mimeType?: string;
  /** リソースの説明 */
  readonly description?: string;
};

/**
 * リソース一覧取得結果
 */
export type McpListResourcesResult = {
  readonly resources: readonly McpResource[];
};

/**
 * リソース読み取りパラメータ
 */
export type McpReadResourceParams = {
  readonly uri: string;
};

/**
 * リソース読み取り結果
 * MCP仕様では `contents` に複数のコンテンツを返せる
 */
export type McpReadResourceResult = {
  readonly contents: ReadonlyArray<{
    readonly uri: string;
    readonly mimeType?: string;
    readonly text?: string;
    readonly blob?: string;
  }>;
};

// ===== MCPプロンプト関連の型 =====

/**
 * プロンプト引数の定義
 */
export type McpPromptArgument = {
  /** 引数名 */
  readonly name: string;
  /** 引数の説明 */
  readonly description?: string;
  /** 必須かどうか */
  readonly required?: boolean;
};

/**
 * MCPプロンプト定義
 */
export type McpPrompt = {
  /** プロンプト名 */
  readonly name: string;
  /** プロンプトの説明 */
  readonly description?: string;
  /** プロンプト引数 */
  readonly arguments?: readonly McpPromptArgument[];
};

// ===== MCP Initialize 関連の型 =====

/**
 * クライアント情報
 */
export type McpClientInfo = {
  /** クライアント名 */
  readonly name: string;
  /** クライアントバージョン */
  readonly version?: string;
};

/**
 * サーバー情報
 */
export type McpServerInfo = {
  /** サーバー名 */
  readonly name: string;
  /** サーバーバージョン */
  readonly version?: string;
};

/**
 * クライアント能力
 */
export type McpClientCapabilities = {
  readonly roots?: {
    readonly listChanged?: boolean;
  };
  readonly sampling?: Record<string, unknown>;
};

/**
 * サーバー能力
 */
export type McpServerCapabilities = {
  readonly tools?: Record<string, unknown>;
  readonly resources?: Record<string, unknown>;
  readonly prompts?: Record<string, unknown>;
  readonly logging?: Record<string, unknown>;
};

/**
 * Initialize リクエストパラメータ
 */
export type McpInitializeParams = {
  /** プロトコルバージョン */
  readonly protocolVersion: string;
  /** クライアント能力 */
  readonly capabilities: McpClientCapabilities;
  /** クライアント情報 */
  readonly clientInfo: McpClientInfo;
};

/**
 * Initialize レスポンス結果
 */
export type McpInitializeResult = {
  /** プロトコルバージョン */
  readonly protocolVersion: string;
  /** サーバー能力 */
  readonly capabilities: McpServerCapabilities;
  /** サーバー情報 */
  readonly serverInfo: McpServerInfo;
};

// ===== Type Guards =====

/**
 * メッセージがMCPリクエストかどうかを判定
 */
export function isMcpRequest(
  message: JsonRpcMessage,
): message is JsonRpcRequest {
  return "method" in message && "id" in message && message.id !== undefined;
}

/**
 * メッセージがMCP通知かどうかを判定
 */
export function isMcpNotification(
  message: JsonRpcMessage,
): message is JsonRpcNotification {
  return "method" in message &&
    (!("id" in message) || message.id === undefined);
}

/**
 * リクエストがtools/callかどうかを判定
 */
export function isMcpToolCallRequest(message: JsonRpcMessage): boolean {
  return isMcpRequest(message) && message.method === "tools/call";
}

/**
 * リクエストがtools/listかどうかを判定
 */
export function isMcpToolsListRequest(message: JsonRpcMessage): boolean {
  return isMcpRequest(message) && message.method === "tools/list";
}
