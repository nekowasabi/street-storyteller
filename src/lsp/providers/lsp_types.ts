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

/**
 * LSP TextDocumentIdentifier型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentIdentifier
 */
export type TextDocumentIdentifier = {
  readonly uri: string;
};

/**
 * LSP SemanticTokens型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokens
 */
export type SemanticTokens = {
  readonly data: number[];
  readonly resultId?: string;
};

/**
 * LSP SemanticTokensParams型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokensParams
 */
export type SemanticTokensParams = {
  readonly textDocument: TextDocumentIdentifier;
};

/**
 * LSP SemanticTokensRangeParams型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#semanticTokensRangeParams
 */
export type SemanticTokensRangeParams = {
  readonly textDocument: TextDocumentIdentifier;
  readonly range: Range;
};

/**
 * LSP SymbolKind 列挙型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#symbolKind
 */
export const SymbolKind = {
  File: 1,
  Module: 2,
  Namespace: 3,
  Package: 4,
  Class: 5,
  Method: 6,
  Property: 7,
  Field: 8,
  Constructor: 9,
  Enum: 10,
  Interface: 11,
  Function: 12,
  Variable: 13,
  Constant: 14,
  String: 15,
  Number: 16,
  Boolean: 17,
  Array: 18,
  Object: 19,
  Key: 20,
  Null: 21,
  EnumMember: 22,
  Struct: 23,
  Event: 24,
  Operator: 25,
  TypeParameter: 26,
} as const;

export type SymbolKindType = typeof SymbolKind[keyof typeof SymbolKind];

/**
 * LSP DocumentSymbol 型
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#documentSymbol
 */
export type DocumentSymbol = {
  readonly name: string;
  readonly detail?: string;
  readonly kind: SymbolKindType;
  readonly range: Range;
  readonly selectionRange: Range;
  readonly children?: DocumentSymbol[];
};

// ランタイム型チェック用ダミーオブジェクト
// テストで型の存在を確認するために使用
export const Position = {} as const;
export const Range = {} as const;
export const SemanticTokens = {} as const;
export const SemanticTokensParams = {} as const;
export const SemanticTokensRangeParams = {} as const;
export const TextDocumentIdentifier = {} as const;
export const DocumentSymbol = {} as const;
