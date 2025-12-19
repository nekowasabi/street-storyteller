/**
 * LSPサーバー
 * LSPプロトコルのメインエントリポイント
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/
 */

import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";
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
} from "@storyteller/lsp/protocol/json_rpc.ts";
import {
  getServerCapabilities,
  type ServerCapabilities,
} from "@storyteller/lsp/server/capabilities.ts";
import { DocumentManager } from "@storyteller/lsp/document/document_manager.ts";
import {
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
  type DidOpenTextDocumentParams,
  TextDocumentSyncHandler,
} from "@storyteller/lsp/handlers/text_document_sync.ts";
import {
  type DetectableEntity,
  type Position,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

// 型の再エクスポート
export type {
  DetectableEntity,
  Position,
} from "@storyteller/lsp/detection/positioned_detector.ts";
export type { EntityInfo } from "@storyteller/lsp/providers/hover_provider.ts";
import { DefinitionProvider } from "@storyteller/lsp/providers/definition_provider.ts";
import {
  type EntityInfo,
  HoverProvider,
} from "@storyteller/lsp/providers/hover_provider.ts";
import {
  CodeActionProvider,
  type Range,
} from "@storyteller/lsp/providers/code_action_provider.ts";
import { SemanticTokensProvider } from "@storyteller/lsp/providers/semantic_tokens_provider.ts";
import { DocumentSymbolProvider } from "@storyteller/lsp/providers/document_symbol_provider.ts";
import { CompletionProvider } from "@storyteller/lsp/providers/completion_provider.ts";
import type {
  SemanticTokensParams,
  SemanticTokensRangeParams,
} from "@storyteller/lsp/providers/lsp_types.ts";
import { DiagnosticsGenerator } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import { DiagnosticsPublisher } from "@storyteller/lsp/diagnostics/diagnostics_publisher.ts";
import { LiteralTypeHoverProvider } from "@storyteller/lsp/providers/literal_type_hover_provider.ts";

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
 * textDocument/codeAction のパラメータ
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeActionParams
 */
type CodeActionParams = {
  textDocument: {
    uri: string;
  };
  range: Range;
  context: {
    diagnostics: Array<{
      range: Range;
      message: string;
      severity?: number;
    }>;
  };
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
  private readonly literalTypeHoverProvider: LiteralTypeHoverProvider;
  private readonly codeActionProvider: CodeActionProvider;
  private readonly semanticTokensProvider: SemanticTokensProvider;
  private readonly documentSymbolProvider: DocumentSymbolProvider;
  private readonly completionProvider: CompletionProvider;

  // 診断
  private readonly diagnosticsGenerator: DiagnosticsGenerator;
  private readonly diagnosticsPublisher: DiagnosticsPublisher;

  constructor(
    transport: LspTransport,
    projectRoot: string,
    options?: LspServerOptions,
  ) {
    this.transport = transport;
    this.projectRoot = projectRoot;

    // ドキュメント管理の初期化
    this.documentManager = new DocumentManager();
    this.textDocumentSyncHandler = new TextDocumentSyncHandler(
      this.documentManager,
    );

    // 検出器の初期化
    const entities = options?.entities ?? [];
    this.detector = new PositionedDetector(entities);

    // プロバイダーの初期化
    this.definitionProvider = new DefinitionProvider(this.detector);
    this.hoverProvider = new HoverProvider(
      this.detector,
      options?.entityInfoMap ?? new Map(),
    );
    this.literalTypeHoverProvider = new LiteralTypeHoverProvider();
    this.codeActionProvider = new CodeActionProvider(this.detector);
    this.semanticTokensProvider = new SemanticTokensProvider(this.detector);
    this.documentSymbolProvider = new DocumentSymbolProvider(this.detector);
    this.completionProvider = new CompletionProvider(entities);

    // 診断機能の初期化
    this.diagnosticsGenerator = new DiagnosticsGenerator(this.detector);
    this.diagnosticsPublisher = new DiagnosticsPublisher(
      { write: (p) => transport.writeRaw(p) },
      { debounceMs: options?.diagnosticsDebounceMs ?? 0 },
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
      case "textDocument/definition":
        await this.handleDefinition(request);
        break;
      case "textDocument/hover":
        await this.handleHover(request);
        break;
      case "textDocument/codeAction":
        await this.handleCodeAction(request);
        break;
      case "textDocument/documentSymbol":
        await this.handleDocumentSymbol(request);
        break;
      case "textDocument/completion":
        await this.handleCompletion(request);
        break;
      // coc.nvim互換性のため、未実装の機能には空配列を返す
      case "textDocument/references":
      case "textDocument/documentHighlight":
      case "textDocument/foldingRange":
      case "textDocument/selectionRange":
      case "textDocument/documentLink":
      case "textDocument/formatting":
      case "textDocument/rangeFormatting":
      case "textDocument/onTypeFormatting":
      case "textDocument/prepareRename":
      case "textDocument/linkedEditingRange":
      case "textDocument/moniker":
      case "textDocument/colorPresentation":
      case "textDocument/documentColor":
      case "textDocument/inlayHint":
      case "textDocument/inlineValue":
      case "workspace/symbol": {
        const emptyResponse = createSuccessResponse(request.id, []);
        await this.transport.writeMessage(emptyResponse);
        break;
      }
      // semantic tokens ハンドラー
      case "textDocument/semanticTokens/full":
        await this.handleSemanticTokensFull(request);
        break;
      case "textDocument/semanticTokens/range":
        await this.handleSemanticTokensRange(request);
        break;
      default: {
        // 未実装のメソッドにはMethodNotFoundエラーを返す（LSP仕様準拠）
        const errorResponse = createErrorResponse(
          request.id,
          -32601, // MethodNotFound
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
      case "textDocument/didOpen":
        await this.handleDidOpen(
          notification.params as DidOpenTextDocumentParams,
        );
        break;
      case "textDocument/didChange":
        await this.handleDidChange(
          notification.params as DidChangeTextDocumentParams,
        );
        break;
      case "textDocument/didClose":
        await this.handleDidClose(
          notification.params as DidCloseTextDocumentParams,
        );
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
        this.projectRoot,
      );
    }

    // coc.nvim等のクライアント互換性のため、nullの代わりに空配列を返す
    const response = createSuccessResponse(request.id, result ?? []);
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
      const uri = params.textDocument.uri;
      const lowerUri = uri.toLowerCase();

      // TypeScriptファイルの場合、まずリテラル型ホバーを試行
      if (lowerUri.endsWith(".ts") || lowerUri.endsWith(".tsx")) {
        result = this.literalTypeHoverProvider.getHover(
          uri,
          document.content,
          params.position,
        );
      }

      // リテラル型ホバーが見つからない場合、既存のホバープロバイダーにフォールバック
      if (!result) {
        result = await this.hoverProvider.getHover(
          uri,
          document.content,
          params.position,
          this.projectRoot,
        );
      }
    }

    // coc.nvim互換性のため、nullの場合は空のホバーを返す
    const response = createSuccessResponse(
      request.id,
      result ?? { contents: [] },
    );
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/codeAction リクエストを処理
   */
  private async handleCodeAction(request: JsonRpcRequest): Promise<void> {
    const params = request.params as CodeActionParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result: unknown[] = [];
    if (document) {
      result = await this.codeActionProvider.getCodeActions(
        params.textDocument.uri,
        document.content,
        params.range,
        params.context.diagnostics,
        this.projectRoot,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/documentSymbol リクエストを処理
   */
  private async handleDocumentSymbol(request: JsonRpcRequest): Promise<void> {
    const params = request.params as { textDocument: { uri: string } };
    const document = this.documentManager.get(params.textDocument.uri);

    let result: unknown[] = [];
    if (document) {
      result = await this.documentSymbolProvider.getDocumentSymbols(
        document.content,
        this.projectRoot,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/semanticTokens/full リクエストを処理
   */
  private async handleSemanticTokensFull(
    request: JsonRpcRequest,
  ): Promise<void> {
    const params = request.params as SemanticTokensParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result = { data: [] as number[] };
    if (document) {
      result = this.semanticTokensProvider.getSemanticTokens(
        params.textDocument.uri,
        document.content,
        this.projectRoot,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/semanticTokens/range リクエストを処理
   */
  private async handleSemanticTokensRange(
    request: JsonRpcRequest,
  ): Promise<void> {
    const params = request.params as SemanticTokensRangeParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result = { data: [] as number[] };
    if (document) {
      result = this.semanticTokensProvider.getSemanticTokensRange(
        params.textDocument.uri,
        document.content,
        params.range,
        this.projectRoot,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/completion リクエストを処理
   */
  private async handleCompletion(request: JsonRpcRequest): Promise<void> {
    const params = request.params as TextDocumentPositionParams;
    const document = this.documentManager.get(params.textDocument.uri);

    let result: { isIncomplete: boolean; items: readonly unknown[] } = {
      isIncomplete: false,
      items: [],
    };
    if (document) {
      result = this.completionProvider.getCompletions(
        params.textDocument.uri,
        document.content,
        params.position.line,
        params.position.character,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * textDocument/didOpen を処理
   * ドキュメントを開き、診断を発行
   */
  private async handleDidOpen(
    params: DidOpenTextDocumentParams,
  ): Promise<void> {
    this.textDocumentSyncHandler.handleDidOpen(params);
    await this.publishDiagnosticsForUri(params.textDocument.uri);
  }

  /**
   * textDocument/didChange を処理
   * ドキュメントを更新し、診断を発行
   */
  private async handleDidChange(
    params: DidChangeTextDocumentParams,
  ): Promise<void> {
    this.textDocumentSyncHandler.handleDidChange(params);
    await this.publishDiagnosticsForUri(params.textDocument.uri);
  }

  /**
   * textDocument/didClose を処理
   * ドキュメントを閉じ、診断をクリア
   */
  private async handleDidClose(
    params: DidCloseTextDocumentParams,
  ): Promise<void> {
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
      this.projectRoot,
    );

    await this.diagnosticsPublisher.publish(uri, diagnostics);
  }
}
