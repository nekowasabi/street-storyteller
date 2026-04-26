package server

import "github.com/takets/street-storyteller/internal/lsp/protocol"

// StandardCapabilities returns the ServerCapabilities advertised by the
// storyteller LSP server.
//
// Why TextDocumentSync=1 (Full): the document store is full-replace only;
// supporting incremental sync (=2) would require maintaining a per-document
// rope and applying ranged edits, which is out of scope for the Go MVP.
func StandardCapabilities() protocol.ServerCapabilities {
	return protocol.ServerCapabilities{
		TextDocumentSync:   1,
		HoverProvider:      true,
		DefinitionProvider: true,
		SemanticTokensProvider: &protocol.SemanticTokensOptions{
			Legend: protocol.SemanticTokensLegend{
				TokenTypes: []string{
					"character",
					"setting",
					"foreshadowing",
				},
				TokenModifiers: []string{
					"highConfidence",
					"mediumConfidence",
					"lowConfidence",
					"planted",
					"resolved",
				},
			},
			Full: true,
		},
	}
}

// StandardServerInfo returns the server name/version reported in the
// initialize response.
func StandardServerInfo() *protocol.ServerInfo {
	return &protocol.ServerInfo{
		Name:    "storyteller-lsp",
		Version: "0.1.0-go",
	}
}
