/**
 * LSPサーバーキャパビリティ定義
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#serverCapabilities
 */

/**
 * テキストドキュメント同期の種類
 */
export const TextDocumentSyncKind = {
  /** 同期なし */
  None: 0,
  /** 全文同期 */
  Full: 1,
  /** 増分同期 */
  Incremental: 2,
} as const;

export type TextDocumentSyncKind =
  (typeof TextDocumentSyncKind)[keyof typeof TextDocumentSyncKind];

/**
 * セマンティックトークンタイプ定義
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokenTypes
 */
export const SEMANTIC_TOKEN_TYPES = [
  "character", // 0: キャラクター名
  "setting", // 1: 設定名（場所・世界観）
  "foreshadowing", // 2: 伏線
] as const;

export type SemanticTokenType = (typeof SEMANTIC_TOKEN_TYPES)[number];

/**
 * セマンティックトークンモディファイア定義
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokenModifiers
 */
export const SEMANTIC_TOKEN_MODIFIERS = [
  "highConfidence", // 0: 信頼度90%以上 (bit 0 = 1)
  "mediumConfidence", // 1: 信頼度70-90% (bit 1 = 2)
  "lowConfidence", // 2: 信頼度70%未満 (bit 2 = 4)
  "planted", // 3: 伏線 - 未回収 (bit 3 = 8)
  "resolved", // 4: 伏線 - 回収済み (bit 4 = 16)
] as const;

export type SemanticTokenModifier = (typeof SEMANTIC_TOKEN_MODIFIERS)[number];

/**
 * セマンティックトークンレジェンド型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokensLegend
 */
export type SemanticTokensLegend = {
  readonly tokenTypes: readonly string[];
  readonly tokenModifiers: readonly string[];
};

/**
 * セマンティックトークンプロバイダーオプション型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokensOptions
 */
export type SemanticTokensOptions = {
  readonly legend: SemanticTokensLegend;
  readonly range?: boolean;
  readonly full?: boolean;
};

/**
 * セマンティックトークンレジェンドを取得する
 */
export function getSemanticTokensLegend(): SemanticTokensLegend {
  return {
    tokenTypes: SEMANTIC_TOKEN_TYPES,
    tokenModifiers: SEMANTIC_TOKEN_MODIFIERS,
  };
}

/**
 * 補完プロバイダーオプション型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#completionOptions
 */
export type CompletionOptions = {
  /** トリガー文字 */
  readonly triggerCharacters?: readonly string[];
  /** 補完アイテムの解決をサポートするか */
  readonly resolveProvider?: boolean;
};

/**
 * コマンド実行プロバイダーオプション型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#executeCommandOptions
 */
export type ExecuteCommandOptions = {
  /** サポートするコマンドID */
  readonly commands: readonly string[];
};

/**
 * サーバーキャパビリティ
 * LSPサーバーがサポートする機能を定義
 */
export type ServerCapabilities = {
  /**
   * テキストドキュメント同期の方法
   * 0: None, 1: Full, 2: Incremental
   */
  readonly textDocumentSync: TextDocumentSyncKind;

  /**
   * 定義ジャンプ機能のサポート
   */
  readonly definitionProvider: boolean;

  /**
   * ホバー情報機能のサポート
   */
  readonly hoverProvider: boolean;

  /**
   * Code Action機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
   */
  readonly codeActionProvider: boolean;

  /**
   * ドキュメントシンボル機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_documentSymbol
   */
  readonly documentSymbolProvider?: boolean;

  /**
   * セマンティックトークン機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens
   */
  readonly semanticTokensProvider?: SemanticTokensOptions;

  /**
   * 補完機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion
   */
  readonly completionProvider?: CompletionOptions;

  /**
   * Code Lens機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeLens
   */
  readonly codeLensProvider?: boolean;

  /**
   * コマンド実行機能のサポート
   * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_executeCommand
   */
  readonly executeCommandProvider?: ExecuteCommandOptions;
};

/**
 * サーバーキャパビリティを取得する
 * Full同期、定義ジャンプ、ホバー、Code Action、ドキュメントシンボル、セマンティックトークン、補完、Code Lensをサポート
 */
export function getServerCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: TextDocumentSyncKind.Full,
    definitionProvider: true,
    hoverProvider: true,
    codeActionProvider: true,
    documentSymbolProvider: true,
    semanticTokensProvider: {
      legend: getSemanticTokensLegend(),
      full: true,
      range: true,
    },
    completionProvider: {
      triggerCharacters: ["@", '"'],
      resolveProvider: false,
    },
    codeLensProvider: true,
    executeCommandProvider: {
      commands: ["storyteller.openReferencedFile"],
    },
  };
}
