/**
 * LSP共通型定義
 * 各プロバイダーで使用する型を一元管理
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/
 */

/**
 * LSP Position型
 * 0-based line and character
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
 * LSP Location型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#location
 */
export type Location = {
  readonly uri: string;
  readonly range: Range;
};

/**
 * LSP MarkupContent型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#markupContent
 */
export type MarkupContent = {
  readonly kind: "plaintext" | "markdown";
  readonly value: string;
};

/**
 * LSP Hover型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#hover
 */
export type Hover = {
  readonly contents: MarkupContent;
  readonly range?: Range;
};

/**
 * LSP TextEdit型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textEdit
 */
export type TextEdit = {
  readonly range: Range;
  readonly newText: string;
};

/**
 * LSP WorkspaceEdit型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspaceEdit
 */
export type WorkspaceEdit = {
  readonly changes?: { [uri: string]: TextEdit[] };
};

/**
 * LSP Diagnostic型（簡略化）
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 */
export type Diagnostic = {
  readonly range: Range;
  readonly message: string;
  readonly severity?: number;
};

/**
 * LSP CodeAction型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeAction
 */
export type CodeAction = {
  readonly title: string;
  readonly kind: "quickfix" | "refactor" | "source";
  readonly diagnostics?: Diagnostic[];
  readonly isPreferred?: boolean;
  readonly edit?: WorkspaceEdit;
};

// ランタイム型チェック用ダミーオブジェクト
// テストで型の存在を確認するために使用
export const Position = {} as const;
export const Range = {} as const;
