/**
 * MCPサーバー
 * MCP (Model Context Protocol) のメインエントリポイント
 * @see https://spec.modelcontextprotocol.io/specification/
 */

import { McpTransport } from "../protocol/transport.ts";
import {
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcNotification,
} from "../../lsp/protocol/types.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  JSON_RPC_METHOD_NOT_FOUND,
} from "../../lsp/protocol/json_rpc.ts";
import { getMcpServerCapabilities } from "./capabilities.ts";
import type {
  McpInitializeParams,
  McpInitializeResult,
  McpServerInfo,
  McpListToolsResult,
  McpTool,
  McpCallToolParams,
} from "../protocol/types.ts";
import { ToolRegistry } from "../tools/tool_registry.ts";

/** サーバー未初期化エラーコード (MCP仕様) */
const SERVER_NOT_INITIALIZED = -32002;

/** プロトコルバージョン */
const PROTOCOL_VERSION = "2024-11-05";

/**
 * サーバーの状態
 */
type ServerState = "uninitialized" | "initializing" | "initialized";

/**
 * McpServerオプション
 */
export type McpServerOptions = {
  /** サーバー名 */
  serverName?: string;
  /** サーバーバージョン */
  serverVersion?: string;
  /** 登録済みツール */
  tools?: readonly McpTool[];
  /** ツールレジストリ（ツール実行用） */
  toolRegistry?: ToolRegistry;
};

/**
 * MCPサーバークラス
 */
export class McpServer {
  private readonly transport: McpTransport;
  private state: ServerState = "uninitialized";
  private readonly serverInfo: McpServerInfo;
  private readonly tools: readonly McpTool[];
  private readonly toolRegistry?: ToolRegistry;

  constructor(transport: McpTransport, options?: McpServerOptions) {
    this.transport = transport;
    this.serverInfo = {
      name: options?.serverName ?? "storyteller-mcp",
      version: options?.serverVersion ?? "0.1.0",
    };
    this.tools = options?.tools ?? [];
    this.toolRegistry = options?.toolRegistry;
  }

  /**
   * サーバーが初期化済みかどうかを返す
   */
  isInitialized(): boolean {
    return this.state === "initialized";
  }

  /**
   * メッセージループを開始
   */
  async start(): Promise<void> {
    while (true) {
      const result = await this.transport.readMessage();
      if (!result.ok) {
        // 接続が閉じられたかエラー
        break;
      }
      await this.handleMessage(result.value);
    }
  }

  /**
   * メッセージを処理
   */
  async handleMessage(message: JsonRpcMessage): Promise<void> {
    if (isJsonRpcRequest(message)) {
      await this.handleRequest(message);
    } else if (isJsonRpcNotification(message)) {
      await this.handleNotification(message);
    }
    // レスポンスは無視（このサーバーはクライアントへのリクエストを送らない）
  }

  /**
   * リクエストを処理
   */
  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    // 初期化前は initialize のみ許可
    if (this.state === "uninitialized" && request.method !== "initialize") {
      const errorResponse = createErrorResponse(
        request.id,
        SERVER_NOT_INITIALIZED,
        "Server not initialized"
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    switch (request.method) {
      case "initialize":
        await this.handleInitialize(request);
        break;
      case "shutdown":
        await this.handleShutdown(request);
        break;
      case "tools/list":
        await this.handleToolsList(request);
        break;
      case "tools/call":
        await this.handleToolsCall(request);
        break;
      default:
        // 未実装のメソッド
        const errorResponse = createErrorResponse(
          request.id,
          JSON_RPC_METHOD_NOT_FOUND,
          `Method not found: ${request.method}`
        );
        await this.transport.writeMessage(errorResponse);
        break;
    }
  }

  /**
   * 通知を処理
   */
  private async handleNotification(notification: JsonRpcNotification): Promise<void> {
    switch (notification.method) {
      case "initialized":
        this.handleInitialized();
        break;
      case "exit":
        // サーバー終了
        break;
      default:
        // 未実装の通知は無視
        break;
    }
  }

  /**
   * initialize リクエストを処理
   */
  private async handleInitialize(request: JsonRpcRequest): Promise<void> {
    this.state = "initializing";

    const _params = request.params as McpInitializeParams;

    const result: McpInitializeResult = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: getMcpServerCapabilities(),
      serverInfo: this.serverInfo,
    };

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * initialized 通知を処理
   */
  private handleInitialized(): void {
    this.state = "initialized";
  }

  /**
   * shutdown リクエストを処理
   */
  private async handleShutdown(request: JsonRpcRequest): Promise<void> {
    const response = createSuccessResponse(request.id, null);
    await this.transport.writeMessage(response);
  }

  /**
   * tools/list リクエストを処理
   */
  private async handleToolsList(request: JsonRpcRequest): Promise<void> {
    const result: McpListToolsResult = {
      tools: this.tools,
    };

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * tools/call リクエストを処理
   */
  private async handleToolsCall(request: JsonRpcRequest): Promise<void> {
    if (!this.toolRegistry) {
      const errorResponse = createErrorResponse(
        request.id,
        JSON_RPC_METHOD_NOT_FOUND,
        "Tool execution not available: no tool registry configured"
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    const params = request.params as McpCallToolParams;
    const result = await this.toolRegistry.execute(
      params.name,
      params.arguments ?? {}
    );

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }
}
