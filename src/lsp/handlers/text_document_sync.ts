/**
 * テキストドキュメント同期ハンドラ
 * didOpen, didChange, didClose イベントを処理
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_synchronization
 */

import {
  DocumentManager,
  type Range,
  type TextDocumentContentChangeEvent,
} from "../document/document_manager.ts";

/**
 * TextDocumentItem
 * ドキュメントを開いた時の情報
 */
export type TextDocumentItem = {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  readonly text: string;
};

/**
 * VersionedTextDocumentIdentifier
 * バージョン情報付きドキュメント識別子
 */
export type VersionedTextDocumentIdentifier = {
  readonly uri: string;
  readonly version: number;
};

/**
 * TextDocumentIdentifier
 * ドキュメント識別子
 */
export type TextDocumentIdentifier = {
  readonly uri: string;
};

/**
 * DidOpenTextDocumentParams
 */
export type DidOpenTextDocumentParams = {
  readonly textDocument: TextDocumentItem;
};

/**
 * DidChangeTextDocumentParams
 */
export type DidChangeTextDocumentParams = {
  readonly textDocument: VersionedTextDocumentIdentifier;
  readonly contentChanges: ReadonlyArray<{
    readonly range?: Range;
    readonly text: string;
  }>;
};

/**
 * DidCloseTextDocumentParams
 */
export type DidCloseTextDocumentParams = {
  readonly textDocument: TextDocumentIdentifier;
};

/**
 * 変更通知コールバック
 */
type ChangeCallback = (uri: string) => void;

/**
 * テキストドキュメント同期ハンドラ
 */
export class TextDocumentSyncHandler {
  private readonly documentManager: DocumentManager;
  private onDidOpenCallback?: ChangeCallback;
  private onDidChangeCallback?: ChangeCallback;

  constructor(documentManager: DocumentManager) {
    this.documentManager = documentManager;
  }

  /**
   * ドキュメントが開かれたときのコールバックを設定
   */
  onDidOpen(callback: ChangeCallback): void {
    this.onDidOpenCallback = callback;
  }

  /**
   * ドキュメントが変更されたときのコールバックを設定
   */
  onDidChange(callback: ChangeCallback): void {
    this.onDidChangeCallback = callback;
  }

  /**
   * textDocument/didOpen を処理
   */
  handleDidOpen(params: DidOpenTextDocumentParams): void {
    const { textDocument } = params;
    this.documentManager.open(
      textDocument.uri,
      textDocument.text,
      textDocument.version,
      textDocument.languageId,
    );

    if (this.onDidOpenCallback) {
      this.onDidOpenCallback(textDocument.uri);
    }
  }

  /**
   * textDocument/didChange を処理
   */
  handleDidChange(params: DidChangeTextDocumentParams): void {
    const { textDocument, contentChanges } = params;

    // TextDocumentContentChangeEventに変換
    const changes: TextDocumentContentChangeEvent[] = contentChanges.map((
      change,
    ) => ({
      range: change.range,
      text: change.text,
    }));

    this.documentManager.change(
      textDocument.uri,
      changes,
      textDocument.version,
    );

    if (this.onDidChangeCallback) {
      this.onDidChangeCallback(textDocument.uri);
    }
  }

  /**
   * textDocument/didClose を処理
   */
  handleDidClose(params: DidCloseTextDocumentParams): void {
    const { textDocument } = params;
    this.documentManager.close(textDocument.uri);
  }
}
