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
] as const;

export type SemanticTokenType = (typeof SEMANTIC_TOKEN_TYPES)[number];

/**
 * セマンティックトークンモディファイア定義
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokenModifiers
 */
export const SEMANTIC_TOKEN_MODIFIERS = [
  "highConfidence", // 0: 信頼度90%以上
  "mediumConfidence", // 1: 信頼度70-90%
  "lowConfidence", // 2: 信頼度70%未満
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
};

/**
 * サーバーキャパビリティを取得する
 * Full同期、定義ジャンプ、ホバー、Code Action、ドキュメントシンボル、セマンティックトークンをサポート
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
  };
}
