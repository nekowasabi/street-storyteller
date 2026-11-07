package server

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

const clarityDoc = "---\nstoryteller:\n  chapter_id: ch-03\n  reader_requires:\n    - \"lo\n  reader_shows:\n    - \"loc:\n---\n本文の lo\n"

func labels(items []protocol.CompletionItem) string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Label
	}
	return strings.Join(out, ",")
}

func TestClarityCompletions_PropositionIDs(t *testing.T) {
	items := clarityCompletions(clarityDoc, protocol.Position{Line: 4, Character: 9}, []string{"loc", "hist", "coat"})
	if got := labels(items); got != "loc" {
		t.Errorf("ids = %q, want loc", got)
	}
}

func TestClarityCompletions_StancesAfterColon(t *testing.T) {
	items := clarityCompletions(clarityDoc, protocol.Position{Line: 6, Character: 11}, []string{"loc"})
	if got := labels(items); got != "shown,inferring,convinced,misled,corrected,withheld" {
		t.Errorf("stances = %q", got)
	}
}

func TestClarityCompletions_NothingInBody(t *testing.T) {
	items := clarityCompletions(clarityDoc, protocol.Position{Line: 8, Character: 6}, []string{"loc"})
	if len(items) != 0 {
		t.Errorf("body must get no items, got %v", items)
	}
}

func TestClarityCompletions_RemovedPropositionDisappears(t *testing.T) {
	items := clarityCompletions(clarityDoc, protocol.Position{Line: 4, Character: 9}, []string{"hist"})
	if len(items) != 0 {
		t.Errorf("want no items, got %v", items)
	}
}

func TestServer_CompletionHandler(t *testing.T) {
	srv := NewServer(ServerOptions{Propositions: []string{"loc", "hist"}})
	srv.RegisterStandardHandlers()
	if _, err := srv.dispatcher.Dispatch(context.Background(), "initialize", json.RawMessage(`{}`)); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	srv.docs.Open("file:///ch03.md", clarityDoc)
	res, err := srv.dispatcher.Dispatch(context.Background(), "textDocument/completion",
		json.RawMessage(`{"textDocument":{"uri":"file:///ch03.md"},"position":{"line":4,"character":9}}`))
	if err != nil {
		t.Fatalf("completion: %v", err)
	}
	list, ok := res.(protocol.CompletionList)
	if !ok || labels(list.Items) != "loc" {
		t.Errorf("result = %#v", res)
	}
}
