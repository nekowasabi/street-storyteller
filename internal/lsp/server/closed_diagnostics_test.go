package server

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"

	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

type closeDiagnosticSource struct{}

func (closeDiagnosticSource) Name() string { return "test" }
func (closeDiagnosticSource) Generate(_ context.Context, _, content string) ([]protocol.Diagnostic, error) {
	return []protocol.Diagnostic{{Message: content, Severity: 1}}, nil
}

func TestCloseClearsOnlyThatDocumentsDiagnostics(t *testing.T) {
	var input, output bytes.Buffer
	for _, body := range []string{
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`,
		`{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"file:///a.md","text":"unsaved draft"}}}`,
		`{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"file:///b.md","text":"other document"}}}`,
		`{"jsonrpc":"2.0","method":"textDocument/didClose","params":{"textDocument":{"uri":"file:///a.md"}}}`,
		`{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"file:///a.md","text":"reopened content"}}}`,
	} {
		input.Write(frameBody([]byte(body)))
	}
	srv := NewServer(ServerOptions{Aggregator: &diagnostics.Aggregator{Sources: []diagnostics.DiagnosticSource{closeDiagnosticSource{}}}})
	srv.RegisterStandardHandlers()
	if err := srv.Run(context.Background(), &input, &output); err != nil {
		t.Fatal(err)
	}
	var updates []protocol.PublishDiagnosticsParams
	for _, msg := range readAllResponses(t, &output) {
		if msg.Method != "textDocument/publishDiagnostics" {
			continue
		}
		var update protocol.PublishDiagnosticsParams
		if err := json.Unmarshal(msg.Params, &update); err != nil {
			t.Fatal(err)
		}
		updates = append(updates, update)
	}
	if len(updates) != 4 {
		t.Fatalf("want openA, openB, clearA, reopenA updates; got %+v", updates)
	}
	if updates[2].URI != "file:///a.md" || updates[2].Diagnostics == nil || len(updates[2].Diagnostics) != 0 {
		t.Fatalf("close must publish an empty array for A: %+v", updates[2])
	}
	if updates[1].URI != "file:///b.md" || len(updates[1].Diagnostics) != 1 || len(updates[3].Diagnostics) != 1 || updates[3].Diagnostics[0].Message != "reopened content" {
		t.Fatalf("other/reopened diagnostics changed: %+v", updates)
	}
}
