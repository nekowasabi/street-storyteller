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
};

/**
 * サーバーキャパビリティを取得する
 * MVPではFull同期、定義ジャンプ、ホバー、Code Actionをサポート
 */
export function getServerCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: TextDocumentSyncKind.Full,
    definitionProvider: true,
    hoverProvider: true,
    codeActionProvider: true,
  };
}
