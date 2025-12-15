/**
 * ドキュメント管理
 * テキストドキュメントの同期と管理を担当
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_synchronization
 */

/**
 * LSP Position型
 * 0-based line and character (UTF-16 code units)
 */
export type Position = {
  readonly line: number;
  readonly character: number;
};

/**
 * LSP Range型
 */
export type Range = {
  readonly start: Position;
  readonly end: Position;
};

/**
 * テキストドキュメント変更内容
 */
export type TextDocumentContentChangeEvent = {
  /** 変更範囲（増分更新時のみ） */
  readonly range?: Range;
  /** 新しいテキスト */
  readonly text: string;
};

/**
 * テキストドキュメント
 */
export type TextDocument = {
  readonly uri: string;
  readonly content: string;
  readonly version: number;
  readonly languageId: string;
};

/**
 * ドキュメントマネージャー
 * 開いているドキュメントの状態を管理
 */
export class DocumentManager {
  private readonly documents = new Map<string, TextDocument>();

  /**
   * ドキュメントを開く
   */
  open(
    uri: string,
    content: string,
    version: number,
    languageId: string,
  ): void {
    this.documents.set(uri, {
      uri,
      content,
      version,
      languageId,
    });
  }

  /**
   * ドキュメントを取得
   */
  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * ドキュメントを閉じる
   */
  close(uri: string): void {
    this.documents.delete(uri);
  }

  /**
   * ドキュメントを更新
   */
  change(
    uri: string,
    changes: TextDocumentContentChangeEvent[],
    version: number,
  ): void {
    const doc = this.documents.get(uri);
    if (!doc) {
      return;
    }

    let content = doc.content;

    for (const change of changes) {
      if (change.range) {
        // 増分更新
        content = this.applyIncrementalChange(
          content,
          change.range,
          change.text,
        );
      } else {
        // 全文更新
        content = change.text;
      }
    }

    this.documents.set(uri, {
      uri,
      content,
      version,
      languageId: doc.languageId,
    });
  }

  /**
   * 全てのドキュメントURIを取得
   */
  getAllUris(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * 増分更新を適用
   */
  private applyIncrementalChange(
    content: string,
    range: Range,
    newText: string,
  ): string {
    const lines = content.split("\n");
    const startOffset = this.positionToOffset(lines, range.start);
    const endOffset = this.positionToOffset(lines, range.end);

    return content.substring(0, startOffset) + newText +
      content.substring(endOffset);
  }

  /**
   * Position から文字列オフセットに変換
   * LSPはUTF-16コードユニット単位だが、日本語文字は大抵1コードポイント=1文字なので
   * 簡易的にcharacterを文字インデックスとして扱う
   */
  private positionToOffset(lines: string[], position: Position): number {
    let offset = 0;

    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    if (position.line < lines.length) {
      offset += position.character;
    }

    return offset;
  }
}
