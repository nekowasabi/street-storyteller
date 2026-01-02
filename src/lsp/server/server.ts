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
  type DidChangeWatchedFilesParams,
  type FileEvent,
  getServerCapabilities,
  type ServerCapabilities,
} from "@storyteller/lsp/server/capabilities.ts";
import { DocumentManager } from "@storyteller/lsp/document/document_manager.ts";
import {
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
  type DidOpenTextDocumentParams,
  type DidSaveTextDocumentParams,
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
import { DiagnosticAggregator } from "@storyteller/lsp/diagnostics/diagnostic_aggregator.ts";
import { StorytellerDiagnosticSource } from "@storyteller/lsp/diagnostics/storyteller_diagnostic_source.ts";
import { TextlintDiagnosticSource } from "@storyteller/lsp/integration/textlint/textlint_diagnostic_source.ts";
import { LiteralTypeHoverProvider } from "@storyteller/lsp/providers/literal_type_hover_provider.ts";
import { CodeLensProvider } from "@storyteller/lsp/providers/code_lens_provider.ts";
import { ProjectDetector } from "@storyteller/lsp/project/project_detector.ts";
import {
  type ProjectContext,
  ProjectContextManager,
} from "@storyteller/lsp/project/project_context_manager.ts";
import { loadSingleEntity } from "@storyteller/cli/modules/lsp/start.ts";
import { FrontmatterSyncService } from "@storyteller/application/meta/frontmatter_sync_service.ts";

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
  private readonly codeLensProvider: CodeLensProvider;

  // 診断
  private readonly diagnosticsGenerator: DiagnosticsGenerator;
  private readonly diagnosticsPublisher: DiagnosticsPublisher;
  private readonly diagnosticAggregator: DiagnosticAggregator;

  // マルチプロジェクト対応
  private readonly projectDetector: ProjectDetector;
  private readonly projectContextManager: ProjectContextManager;

  // ファイル変更デバウンス
  private fileChangeDebounceTimer: number | null = null;
  private pendingFileChanges: FileEvent[] = [];
  /** ファイル変更デバウンス遅延時間（ミリ秒） */
  private readonly DEBOUNCE_DELAY = 200;
  /** 増分更新を使用するエンティティファイル変更の最大数 */
  private readonly INCREMENTAL_UPDATE_THRESHOLD = 5;

  // FrontMatter自動同期
  private frontmatterSyncService: FrontmatterSyncService | null = null;
  private readonly autoSyncConfig = {
    enabled: true,
    confidenceThreshold: 0.85,
    entityTypes: ["characters", "settings", "foreshadowings"] as const,
  };

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
    this.codeLensProvider = new CodeLensProvider();

    // 診断機能の初期化
    this.diagnosticsGenerator = new DiagnosticsGenerator(this.detector);

    // DiagnosticAggregatorの初期化
    const storytellerSource = new StorytellerDiagnosticSource(
      this.diagnosticsGenerator,
    );
    const textlintSource = new TextlintDiagnosticSource(this.projectRoot);
    this.diagnosticAggregator = new DiagnosticAggregator([
      storytellerSource,
      textlintSource,
    ]);

    this.diagnosticsPublisher = new DiagnosticsPublisher(
      { write: (p) => transport.writeRaw(p) },
      { debounceMs: options?.diagnosticsDebounceMs ?? 0 },
    );

    // マルチプロジェクト対応の初期化
    this.projectDetector = new ProjectDetector(projectRoot);
    this.projectContextManager = new ProjectContextManager();
  }

  /**
   * サーバーが初期化済みかどうかを返す
   */
  isInitialized(): boolean {
    return this.state === "initialized";
  }

  /**
   * ファイルURIからプロジェクトコンテキストを取得（マルチプロジェクト対応）
   * ファイルの最も近い.storyteller.jsonを検出し、そのプロジェクトのエンティティをロード
   * @param uri ファイルURI
   * @returns プロジェクトコンテキスト（エンティティとEntityInfoMap）
   */
  private async getProjectContext(uri: string): Promise<ProjectContext> {
    const projectRoot = await this.projectDetector.detectProjectRoot(uri);
    return await this.projectContextManager.getContext(projectRoot);
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
      // Code Lens ハンドラー
      case "textDocument/codeLens":
        await this.handleCodeLens(request);
        break;
      // Execute Command ハンドラー
      case "workspace/executeCommand":
        await this.handleExecuteCommand(request);
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
        await this.handleInitialized();
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
      case "textDocument/didSave":
        await this.handleDidSave(
          notification.params as DidSaveTextDocumentParams,
        );
        break;
      case "workspace/didChangeWatchedFiles":
        await this.handleDidChangeWatchedFiles(
          notification.params as DidChangeWatchedFilesParams,
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
  private async handleInitialized(): Promise<void> {
    this.state = "initialized";

    // ファイル監視の動的登録
    const registrationId = `storyteller-file-watcher-${Date.now()}`;
    const registrationParams = {
      registrations: [{
        id: registrationId,
        method: "workspace/didChangeWatchedFiles",
        registerOptions: {
          watchers: [
            { globPattern: "**/src/characters/**/*.ts" },
            { globPattern: "**/src/settings/**/*.ts" },
            { globPattern: "**/src/foreshadowings/**/*.ts" },
            { globPattern: "**/src/timelines/**/*.ts" },
          ],
        },
      }],
    };

    // client/registerCapability リクエストを送信
    const request = {
      jsonrpc: "2.0" as const,
      id: registrationId,
      method: "client/registerCapability",
      params: registrationParams,
    };

    try {
      await this.transport.writeMessage(request);
    } catch (_error) {
      // ファイルウォッチャー登録失敗時は無視
    }
  }

  /**
   * shutdown リクエストを処理
   */
  private async handleShutdown(request: JsonRpcRequest): Promise<void> {
    // リソースのクリーンアップ（タイマー、診断アグリゲーター等）
    this.dispose();

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
      // マルチプロジェクト対応：ファイルURIからプロジェクトルートを動的に取得
      const uri = params.textDocument.uri;
      const projectRoot = await this.projectDetector.detectProjectRoot(uri);
      result = await this.definitionProvider.getDefinition(
        uri,
        document.content,
        params.position,
        projectRoot,
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
        // マルチプロジェクト対応：ファイルURIからプロジェクトコンテキストを動的に取得
        const context = await this.getProjectContext(uri);
        // 動的コンテキストにエンティティがある場合のみオーバーライド
        // （テスト等でモックURIを使用する場合、動的検出できないためフォールバック）
        const options = context.entityInfoMap.size > 0
          ? { entityInfoMap: context.entityInfoMap }
          : undefined;
        result = await this.hoverProvider.getHover(
          uri,
          document.content,
          params.position,
          this.projectRoot,
          options,
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
   * textDocument/didSave を処理
   * 原稿ファイル保存時にFrontMatterを自動更新
   */
  private async handleDidSave(
    params: DidSaveTextDocumentParams,
  ): Promise<void> {
    if (!this.autoSyncConfig.enabled) return;

    const uri = params.textDocument.uri;
    if (!this.isManuscriptFile(uri)) return;

    // 遅延初期化
    if (!this.frontmatterSyncService) {
      const context = await this.getProjectContext(uri);
      this.frontmatterSyncService = new FrontmatterSyncService(
        this.projectRoot,
        [...context.entities],
      );
    }

    try {
      const filePath = this.uriToFilePath(uri);
      await this.frontmatterSyncService.sync(filePath, {
        mode: "add",
        confidenceThreshold: this.autoSyncConfig.confidenceThreshold,
        entityTypes: [...this.autoSyncConfig.entityTypes],
        dryRun: false,
      });
    } catch (error) {
      // エラーはログに記録するが、クライアントには通知しない
      console.error(`[didSave] FrontMatter sync failed: ${error}`);
    }
  }

  /**
   * URIが原稿ファイルかどうかを判定
   */
  private isManuscriptFile(uri: string): boolean {
    return uri.endsWith(".md") && uri.includes("/manuscripts/");
  }

  /**
   * file:// URIをファイルパスに変換
   */
  private uriToFilePath(uri: string): string {
    return decodeURIComponent(uri.replace(/^file:\/\//, ""));
  }

  /**
   * ファイル変更監視ハンドラ
   * プロジェクト内のTypeScriptファイル（キャラクター、設定、伏線など）が
   * 外部から変更された場合にキャッシュをクリアし、開いているドキュメントの診断を再発行
   */
  private async handleDidChangeWatchedFiles(
    params: DidChangeWatchedFilesParams,
  ): Promise<void> {
    // 変更をバッファに追加
    this.pendingFileChanges.push(...params.changes);

    // 既存タイマーをクリア
    if (this.fileChangeDebounceTimer !== null) {
      clearTimeout(this.fileChangeDebounceTimer);
    }

    // 新しいタイマーをセット
    this.fileChangeDebounceTimer = setTimeout(() => {
      const changes = [...this.pendingFileChanges];
      this.pendingFileChanges = [];
      this.fileChangeDebounceTimer = null;
      this.processFileChanges(changes);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * デバウンス後にファイル変更を実際に処理
   */
  private async processFileChanges(changes: FileEvent[]): Promise<void> {
    // エンティティファイルの変更のみ抽出
    const entityChanges = changes.filter((c) => this.isEntityFile(c.uri));
    const nonEntityChanges = changes.filter((c) => !this.isEntityFile(c.uri));

    // 差分更新を試行
    if (
      entityChanges.length > 0 &&
      entityChanges.length <= this.INCREMENTAL_UPDATE_THRESHOLD
    ) {
      // 少数のエンティティファイル変更は差分更新
      try {
        for (const change of entityChanges) {
          const relPath = this.uriToRelativePath(change.uri);
          const entity = await loadSingleEntity(this.projectRoot, relPath);
          if (entity) {
            this.detector.updateSingleEntity(entity);
          }
        }
      } catch {
        // インクリメンタル更新失敗時はフルリロード
        await this.fullReload();
      }
    } else if (
      entityChanges.length > this.INCREMENTAL_UPDATE_THRESHOLD ||
      nonEntityChanges.length > 0
    ) {
      // 多数の変更またはエンティティ以外の変更がある場合はフルリロード
      await this.fullReload();
    }

    // 開いているドキュメントの診断を再発行
    const openDocumentUris = this.documentManager.getAllUris();
    for (const uri of openDocumentUris) {
      try {
        await this.publishDiagnosticsForUri(uri);
      } catch {
        // 診断発行失敗時は無視
      }
    }

    // セマンティックトークンの再取得をクライアントに要求
    try {
      const refreshRequestId = `semantic-refresh-${Date.now()}`;
      await this.transport.writeMessage({
        jsonrpc: "2.0" as const,
        id: refreshRequestId,
        method: "workspace/semanticTokens/refresh",
        params: {},
      });
    } catch {
      // セマンティックトークンリフレッシュ失敗時は無視
    }
  }

  /**
   * フルリロード（キャッシュクリア + 全エンティティ再読み込み）
   */
  private async fullReload(): Promise<void> {
    try {
      this.projectContextManager.clearCache();
    } catch {
      // キャッシュクリア失敗時は無視
    }

    try {
      const context = await this.projectContextManager.getContext(
        this.projectRoot,
      );
      const entities = [...context.entities];
      this.detector.updateEntities(entities);
    } catch {
      // エンティティ更新失敗時は無視
    }
  }

  /**
   * URIがエンティティファイルかどうかを判定
   */
  private isEntityFile(uri: string): boolean {
    return (
      uri.includes("/characters/") ||
      uri.includes("/settings/") ||
      uri.includes("/foreshadowings/")
    );
  }

  /**
   * file:// URIをプロジェクトルートからの相対パスに変換
   */
  private uriToRelativePath(uri: string): string {
    // file:// プレフィックスを削除
    const filePath = uri.replace(/^file:\/\//, "");
    // URLエンコードされた文字をデコード（日本語ファイル名対応）
    const decodedPath = decodeURIComponent(filePath);
    // プロジェクトルートを削除して相対パスに
    const projectRootWithSlash = this.projectRoot.endsWith("/")
      ? this.projectRoot
      : this.projectRoot + "/";
    return decodedPath.replace(projectRootWithSlash, "");
  }

  /**
   * 指定URIの診断を発行
   */
  private async publishDiagnosticsForUri(uri: string): Promise<void> {
    const document = this.documentManager.get(uri);
    if (!document) return;

    // DiagnosticAggregatorを使用して複数ソースから診断を取得
    const diagnostics = await this.diagnosticAggregator.generate(
      uri,
      document.content,
      this.projectRoot,
    );

    await this.diagnosticsPublisher.publish(uri, diagnostics);
  }

  /**
   * textDocument/codeLens リクエストを処理
   */
  private async handleCodeLens(request: JsonRpcRequest): Promise<void> {
    const params = request.params as { textDocument: { uri: string } };
    const document = this.documentManager.get(params.textDocument.uri);

    let result: unknown[] = [];
    if (document) {
      result = this.codeLensProvider.provideCodeLenses(
        params.textDocument.uri,
        document.content,
      );
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * workspace/executeCommand リクエストを処理
   */
  private async handleExecuteCommand(request: JsonRpcRequest): Promise<void> {
    const params = request.params as {
      command: string;
      arguments?: unknown[];
    };

    let result: unknown = null;

    switch (params.command) {
      case "storyteller.openReferencedFile": {
        // ファイル参照を開くコマンド
        // 実際のファイル表示はクライアント側で行うため、ここでは成功を返す
        // クライアントはコマンド実行後にwindow/showDocument等で対応
        result = { success: true, uri: params.arguments?.[0] };
        break;
      }
      default:
        // 未知のコマンド
        result = {
          success: false,
          error: `Unknown command: ${params.command}`,
        };
        break;
    }

    const response = createSuccessResponse(request.id, result);
    await this.transport.writeMessage(response);
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    // デバウンスタイマーをクリア
    if (this.fileChangeDebounceTimer !== null) {
      clearTimeout(this.fileChangeDebounceTimer);
      this.fileChangeDebounceTimer = null;
    }
    this.pendingFileChanges = [];

    this.diagnosticAggregator.dispose();
  }
}
