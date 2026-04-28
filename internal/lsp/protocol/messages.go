package protocol

import "encoding/json"

// InitializeParams is the params for `initialize`.
// Capabilities is kept as RawMessage; downstream layers decode the parts they
// care about (textDocument/* etc.) on demand.
type InitializeParams struct {
	ProcessID    *int32          `json:"processId"`
	RootURI      string          `json:"rootUri"`
	Capabilities json.RawMessage `json:"capabilities"`
}

// InitializeResult is the response for `initialize`.
type InitializeResult struct {
	Capabilities ServerCapabilities `json:"capabilities"`
	ServerInfo   *ServerInfo        `json:"serverInfo,omitempty"`
}

// ServerInfo identifies the server name/version reported back to the client.
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// ServerCapabilities advertises the LSP features this server implements.
type ServerCapabilities struct {
	TextDocumentSync       int                    `json:"textDocumentSync"`
	HoverProvider          bool                   `json:"hoverProvider"`
	DefinitionProvider     bool                   `json:"definitionProvider"`
	SemanticTokensProvider *SemanticTokensOptions `json:"semanticTokensProvider,omitempty"`
}

// SemanticTokensOptions advertises semantic-tokens support.
type SemanticTokensOptions struct {
	Legend SemanticTokensLegend `json:"legend"`
	Full   bool                 `json:"full"`
}

// SemanticTokensLegend declares the token type/modifier vocabulary.
type SemanticTokensLegend struct {
	TokenTypes     []string `json:"tokenTypes"`
	TokenModifiers []string `json:"tokenModifiers"`
}

// HoverParams is the params for `textDocument/hover`.
type HoverParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
}

// HoverResult is the result for `textDocument/hover`.
type HoverResult struct {
	Contents MarkupContent `json:"contents"`
}

// MarkupContent carries either plaintext or markdown-formatted content.
type MarkupContent struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

// DefinitionParams is the params for `textDocument/definition`.
type DefinitionParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
}

// DefinitionResult is the result for `textDocument/definition`.
//
// Why: alias instead of named struct so callers can pass / append to it as a
// regular []Location while still expressing intent at the API boundary.
type DefinitionResult = []Location

// SemanticTokensParams is the params for `textDocument/semanticTokens/full`.
type SemanticTokensParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
}

// SemanticTokens is the result for semantic token requests. Data uses the LSP
// relative integer encoding: deltaLine, deltaStart, length, tokenType,
// tokenModifiers.
type SemanticTokens struct {
	Data []uint32 `json:"data"`
}

// DidOpenTextDocumentParams is the params for `textDocument/didOpen`.
type DidOpenTextDocumentParams struct {
	TextDocument TextDocumentItem `json:"textDocument"`
}

// TextDocumentItem is the full content of a newly-opened document.
type TextDocumentItem struct {
	URI        string `json:"uri"`
	LanguageID string `json:"languageId"`
	Version    int    `json:"version"`
	Text       string `json:"text"`
}

// DidChangeTextDocumentParams is the params for `textDocument/didChange`.
type DidChangeTextDocumentParams struct {
	TextDocument   VersionedTextDocumentIdentifier  `json:"textDocument"`
	ContentChanges []TextDocumentContentChangeEvent `json:"contentChanges"`
}

// TextDocumentContentChangeEvent represents a single edit. Range==nil means
// full-document replacement, which is what this server uses (TextDocumentSync
// = Full).
type TextDocumentContentChangeEvent struct {
	Range *Range `json:"range,omitempty"`
	Text  string `json:"text"`
}

// PublishDiagnosticsParams is the params for `textDocument/publishDiagnostics`.
type PublishDiagnosticsParams struct {
	URI         string       `json:"uri"`
	Diagnostics []Diagnostic `json:"diagnostics"`
}
