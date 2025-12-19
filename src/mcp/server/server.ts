/**
 * MCPサーバー
 * MCP (Model Context Protocol) のメインエントリポイント
 * @see https://spec.modelcontextprotocol.io/specification/
 */

import { McpTransport } from "@storyteller/mcp/protocol/transport.ts";
import {
  isJsonRpcNotification,
  isJsonRpcRequest,
  type JsonRpcMessage,
  type JsonRpcNotification,
  type JsonRpcRequest,
} from "@storyteller/lsp/protocol/types.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  JSON_RPC_METHOD_NOT_FOUND,
} from "@storyteller/lsp/protocol/json_rpc.ts";
import { getMcpServerCapabilities } from "@storyteller/mcp/server/capabilities.ts";
import { MCP_ERROR_CODES } from "@storyteller/mcp/protocol/types.ts";
import type {
  McpCallToolParams,
  McpInitializeParams,
  McpInitializeResult,
  McpListResourcesResult,
  McpListToolsResult,
  McpReadResourceResult,
  McpServerInfo,
  McpTool,
} from "@storyteller/mcp/protocol/types.ts";
import { ToolRegistry } from "@storyteller/mcp/tools/tool_registry.ts";
import type { ResourceProvider } from "@storyteller/mcp/resources/resource_provider.ts";
import {
  handleResourcesList,
  handleResourcesRead,
} from "@storyteller/mcp/server/handlers/resources.ts";
import { PromptRegistry } from "@storyteller/mcp/prompts/prompt_registry.ts";
import {
  handlePromptsGet,
  handlePromptsList,
} from "@storyteller/mcp/server/handlers/prompts.ts";

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
  /** リソースプロバイダー（resources/list, resources/read 用） */
  resourceProvider?: ResourceProvider;
  /** プロンプトレジストリ（prompts/list, prompts/get 用） */
  promptRegistry?: PromptRegistry;
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
  private readonly resourceProvider?: ResourceProvider;
  private readonly promptRegistry?: PromptRegistry;

  constructor(transport: McpTransport, options?: McpServerOptions) {
    this.transport = transport;
    this.serverInfo = {
      name: options?.serverName ?? "storyteller-mcp",
      version: options?.serverVersion ?? "0.1.0",
    };
    this.tools = options?.tools ?? [];
    this.toolRegistry = options?.toolRegistry;
    this.resourceProvider = options?.resourceProvider;
    this.promptRegistry = options?.promptRegistry;
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
        "Server not initialized",
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
      case "resources/list":
        await this.handleResourcesList(request);
        break;
      case "resources/read":
        await this.handleResourcesRead(request);
        break;
      case "prompts/list":
        await this.handlePromptsList(request);
        break;
      case "prompts/get":
        await this.handlePromptsGet(request);
        break;
      default: {
        // 未実装のメソッド
        const errorResponse = createErrorResponse(
          request.id,
          JSON_RPC_METHOD_NOT_FOUND,
          `Method not found: ${request.method}`,
        );
        await this.transport.writeMessage(errorResponse);
        break;
      }
    }
  }

  /**
   * 通知を処理
   */
  private async handleNotification(
    notification: JsonRpcNotification,
  ): Promise<void> {
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
        "Tool execution not available: no tool registry configured",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    const params = request.params as McpCallToolParams;
    const result = await this.toolRegistry.execute(
      params.name,
      params.arguments ?? {},
    );

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * resources/list リクエストを処理
   */
  private async handleResourcesList(request: JsonRpcRequest): Promise<void> {
    if (!this.resourceProvider) {
      const errorResponse = createErrorResponse(
        request.id,
        JSON_RPC_METHOD_NOT_FOUND,
        "Resource access not available: no resource provider configured",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    try {
      const resources = await handleResourcesList(this.resourceProvider);
      const result: McpListResourcesResult = { resources };
      const response = createSuccessResponse(request.id, result);
      await this.transport.writeMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        message,
      );
      await this.transport.writeMessage(errorResponse);
    }
  }

  /**
   * resources/read リクエストを処理
   */
  private async handleResourcesRead(request: JsonRpcRequest): Promise<void> {
    if (!this.resourceProvider) {
      const errorResponse = createErrorResponse(
        request.id,
        JSON_RPC_METHOD_NOT_FOUND,
        "Resource access not available: no resource provider configured",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    const uri = (() => {
      const params: unknown = request.params;
      if (typeof params !== "object" || params === null) {
        return undefined;
      }
      if (!("uri" in params)) {
        return undefined;
      }
      const rawUri = (params as { uri?: unknown }).uri;
      return typeof rawUri === "string" ? rawUri : undefined;
    })();
    if (!uri || typeof uri !== "string") {
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        "Invalid params: 'uri' is required",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    try {
      const text = await handleResourcesRead(this.resourceProvider, uri);
      const result: McpReadResourceResult = {
        contents: [
          { uri, mimeType: "text/plain", text },
        ],
      };
      const response = createSuccessResponse(request.id, result);
      await this.transport.writeMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        message,
      );
      await this.transport.writeMessage(errorResponse);
    }
  }

  /**
   * prompts/list リクエストを処理
   */
  private async handlePromptsList(request: JsonRpcRequest): Promise<void> {
    if (!this.promptRegistry) {
      const errorResponse = createErrorResponse(
        request.id,
        JSON_RPC_METHOD_NOT_FOUND,
        "Prompt access not available: no prompt registry configured",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    try {
      const result = handlePromptsList(this.promptRegistry);
      const response = createSuccessResponse(request.id, result);
      await this.transport.writeMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        message,
      );
      await this.transport.writeMessage(errorResponse);
    }
  }

  /**
   * prompts/get リクエストを処理
   */
  private async handlePromptsGet(request: JsonRpcRequest): Promise<void> {
    if (!this.promptRegistry) {
      const errorResponse = createErrorResponse(
        request.id,
        JSON_RPC_METHOD_NOT_FOUND,
        "Prompt access not available: no prompt registry configured",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    const params = (request.params ?? {}) as Record<string, unknown>;
    const name = params.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        "Invalid params: 'name' is required",
      );
      await this.transport.writeMessage(errorResponse);
      return;
    }

    const argumentsRaw = params.arguments;
    const argumentsObj = (argumentsRaw && typeof argumentsRaw === "object")
      ? argumentsRaw as Record<string, string>
      : undefined;

    try {
      const result = handlePromptsGet(this.promptRegistry, {
        name,
        arguments: argumentsObj,
      });
      const response = createSuccessResponse(request.id, result);
      await this.transport.writeMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResponse = createErrorResponse(
        request.id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        message,
      );
      await this.transport.writeMessage(errorResponse);
    }
  }
}
