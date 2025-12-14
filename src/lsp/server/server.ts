/**
 * LSPサーバー
 * LSPプロトコルのメインエントリポイント
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/
 */

import { LspTransport } from "../protocol/transport.ts";
import {
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcNotification,
} from "../protocol/types.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  JSON_RPC_METHOD_NOT_FOUND,
} from "../protocol/json_rpc.ts";
import { getServerCapabilities, type ServerCapabilities } from "./capabilities.ts";
import { DocumentManager } from "../document/document_manager.ts";
import {
  TextDocumentSyncHandler,
  type DidOpenTextDocumentParams,
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
} from "../handlers/text_document_sync.ts";
import {
  PositionedDetector,
  type DetectableEntity,
  type Position,
} from "../detection/positioned_detector.ts";

// 型の再エクスポート
export type { DetectableEntity, Position } from "../detection/positioned_detector.ts";
export type { EntityInfo } from "../providers/hover_provider.ts";
import { DefinitionProvider } from "../providers/definition_provider.ts";
import { HoverProvider, type EntityInfo } from "../providers/hover_provider.ts";
import { DiagnosticsGenerator } from "../diagnostics/diagnostics_generator.ts";
import { DiagnosticsPublisher } from "../diagnostics/diagnostics_publisher.ts";

/** サーバー未初期化エラーコード (LSP仕様) */
const SERVER_NOT_INITIALIZED = -32002;

/**
 * InitializeParams型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#initializeParams
 */
export type InitializeParams = {
  readonly processId: number | null;
  readonly rootUri: string | null;
  readonly capabilities: Record<string, unknown>;
};

/**
 * InitializeResult型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#initializeResult
 */
export type InitializeResult = {
  readonly capabilities: ServerCapabilities;
  readonly serverInfo?: {
    readonly name: string;
    readonly version?: string;
  };
};

/**
 * サーバーの状態
 */
type ServerState = "uninitialized" | "initializing" | "initialized";

/**
 * LspServerオプション
 */
export type LspServerOptions = {
  /** 検出対象のエンティティ */
  entities?: DetectableEntity[];
  /** エンティティ情報マップ（ホバー表示用） */
  entityInfoMap?: Map<string, EntityInfo>;
  /** 診断発行のデバウンス時間（ミリ秒） */
  diagnosticsDebounceMs?: number;
};

/**
 * textDocument/definition のパラメータ
 */
type TextDocumentPositionParams = {
  textDocument: {
    uri: string;
  };
  position: Position;
};

/**
 * LSPサーバークラス
 */
export class LspServer {
  private readonly transport: LspTransport;
  private readonly projectRoot: string;
  private state: ServerState = "uninitialized";

  // ドキュメント管理
  private readonly documentManager: DocumentManager;
  private readonly textDocumentSyncHandler: TextDocumentSyncHandler;

  // プロバイダー
  private readonly detector: PositionedDetector;
  private readonly definitionProvider: DefinitionProvider;
  private readonly hoverProvider: HoverProvider;

  // 診断
  private readonly diagnosticsGenerator: DiagnosticsGenerator;
  private readonly diagnosticsPublisher: DiagnosticsPublisher;

  constructor(
    transport: LspTransport,
    projectRoot: string,
    options?: LspServerOptions
  ) {
    this.transport = transport;
    this.projectRoot = projectRoot;

    // ドキュメント管理の初期化
    this.documentManager = new DocumentManager();
    this.textDocumentSyncHandler = new TextDocumentSyncHandler(this.documentManager);

    // 検出器の初期化
    const entities = options?.entities ?? [];
    this.detector = new PositionedDetector(entities);

    // プロバイダーの初期化
    this.definitionProvider = new DefinitionProvider(this.detector);
    this.hoverProvider = new HoverProvider(
      this.detector,
      options?.entityInfoMap ?? new Map()
    );

    // 診断機能の初期化
    this.diagnosticsGenerator = new DiagnosticsGenerator(this.detector);
    this.diagnosticsPublisher = new DiagnosticsPublisher(
      { write: (p) => transport.writeRaw(p) },
      { debounceMs: options?.diagnosticsDebounceMs ?? 0 }
    );
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
      case "textDocument/definition":
        await this.handleDefinition(request);
        break;
      case "textDocument/hover":
        await this.handleHover(request);
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
      case "textDocument/didOpen":
        await this.handleDidOpen(notification.params as DidOpenTextDocumentParams);
        break;
      case "textDocument/didChange":
        await this.handleDidChange(notification.params as DidChangeTextDocumentParams);
        break;
      case "textDocument/didClose":
        await this.handleDidClose(notification.params as DidCloseTextDocumentParams);
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

    const result: InitializeResult = {
      capabilities: getServerCapabilities(),
      serverInfo: {
        name: "storyteller-lsp",
        version: "0.1.0",
      },
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
   * textDocument/definition リクエストを処理
   */
  private async handleDefinition(request: JsonRpcRequest): Promise<void> {
    const params = request.params as TextDocumentPositionParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result = null;
    if (document) {
      result = await this.definitionProvider.getDefinition(
        params.textDocument.uri,
        document.content,
        params.position,
        this.projectRoot
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/hover リクエストを処理
   */
  private async handleHover(request: JsonRpcRequest): Promise<void> {
    const params = request.params as TextDocumentPositionParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result = null;
    if (document) {
      result = await this.hoverProvider.getHover(
        params.textDocument.uri,
        document.content,
        params.position,
        this.projectRoot
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/didOpen を処理
   * ドキュメントを開き、診断を発行
   */
  private async handleDidOpen(params: DidOpenTextDocumentParams): Promise<void> {
    this.textDocumentSyncHandler.handleDidOpen(params);
    await this.publishDiagnosticsForUri(params.textDocument.uri);
  }

  /**
   * textDocument/didChange を処理
   * ドキュメントを更新し、診断を発行
   */
  private async handleDidChange(params: DidChangeTextDocumentParams): Promise<void> {
    this.textDocumentSyncHandler.handleDidChange(params);
    await this.publishDiagnosticsForUri(params.textDocument.uri);
  }

  /**
   * textDocument/didClose を処理
   * ドキュメントを閉じ、診断をクリア
   */
  private async handleDidClose(params: DidCloseTextDocumentParams): Promise<void> {
    this.textDocumentSyncHandler.handleDidClose(params);
    // 診断をクリア（空の診断配列を発行）
    await this.diagnosticsPublisher.publish(params.textDocument.uri, []);
  }

  /**
   * 指定URIの診断を発行
   */
  private async publishDiagnosticsForUri(uri: string): Promise<void> {
    const document = this.documentManager.get(uri);
    if (!document) return;

    const diagnostics = await this.diagnosticsGenerator.generate(
      uri,
      document.content,
      this.projectRoot
    );

    await this.diagnosticsPublisher.publish(uri, diagnostics);
  }
}
