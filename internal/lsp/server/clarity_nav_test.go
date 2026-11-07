package server

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

const clarityNavDoc = "---\nstoryteller:\n  chapter_id: ch-01\n  reader_shows:\n    - \"S08:shown\"\n    - \"S26:withheld\"\n---\nS08 本文\n"

func clarityNavServer(t *testing.T) (*Server, string) {
	t.Helper()
	root := t.TempDir()
	writeHeroProject(t, root)
	path := filepath.Join(root, "src", "propositions", "01", "s08.ts")
	mustWrite(t, path, `export const S08 = {"id":"S08","statement":"願いが叶ったかを決めるのは依頼人","authorTruth":true,"resolutionPolicy":"may-remain-withheld"};`)
	opts, err := NewServerOptions(context.Background(), "file://"+root)
	if err != nil {
		t.Fatal(err)
	}
	srv := NewServer(opts)
	srv.RegisterStandardHandlers()
	if _, err := srv.dispatcher.Dispatch(context.Background(), "initialize", json.RawMessage(`{}`)); err != nil {
		t.Fatal(err)
	}
	srv.docs.Open("file:///ch01.md", clarityNavDoc)
	return srv, path
}

func dispatchAt(t *testing.T, srv *Server, method string, line, char int) any {
	t.Helper()
	res, err := srv.dispatcher.Dispatch(context.Background(), method, json.RawMessage(fmt.Sprintf(
		`{"textDocument":{"uri":"file:///ch01.md"},"position":{"line":%d,"character":%d}}`, line, char)))
	if err != nil {
		t.Fatalf("%s: %v", method, err)
	}
	return res
}

func hoverText(res any) string {
	h, ok := res.(*protocol.HoverResult)
	if !ok || h == nil {
		return ""
	}
	return h.Contents.Value
}

func TestClarityHover_PropositionShowsStatement(t *testing.T) {
	srv, _ := clarityNavServer(t)
	if got := hoverText(dispatchAt(t, srv, "textDocument/hover", 4, 8)); !strings.Contains(got, "願いが叶ったかを決めるのは依頼人") {
		t.Errorf("hover = %q", got)
	}
}

func TestClarityHover_StanceShowsMeaning(t *testing.T) {
	srv, _ := clarityNavServer(t)
	if got := hoverText(dispatchAt(t, srv, "textDocument/hover", 5, 12)); !strings.Contains(got, "withheld") || !strings.Contains(got, "伏せた") {
		t.Errorf("hover = %q", got)
	}
}

func TestClarityHover_UnknownPropositionIsNull(t *testing.T) {
	srv, _ := clarityNavServer(t)
	if got := hoverText(dispatchAt(t, srv, "textDocument/hover", 5, 8)); got != "" {
		t.Errorf("hover = %q, want none for undefined S26", got)
	}
}

func TestClarityDefinition_JumpsToNestedPropositionFile(t *testing.T) {
	srv, path := clarityNavServer(t)
	got, ok := dispatchAt(t, srv, "textDocument/definition", 4, 8).(protocol.DefinitionResult)
	if !ok || len(got) != 1 || got[0].URI != "file://"+path {
		t.Fatalf("definition = %#v, want %s", got, path)
	}
}

func TestClarityInlayHint_LabelsKnownPropositionAtLineEnd(t *testing.T) {
	srv, _ := clarityNavServer(t)
	res, err := srv.dispatcher.Dispatch(context.Background(), "textDocument/inlayHint", json.RawMessage(
		`{"textDocument":{"uri":"file:///ch01.md"},"range":{"start":{"line":0,"character":0},"end":{"line":9,"character":0}}}`))
	if err != nil {
		t.Fatal(err)
	}
	hints, _ := res.([]protocol.InlayHint)
	if len(hints) != 1 {
		t.Fatalf("hints = %#v, want one for S08 (S26 is undefined)", hints)
	}
	want := protocol.Position{Line: 4, Character: uint32(len(`    - "S08:shown"`))}
	if hints[0].Position != want || hints[0].Label != "願いが叶ったかを決めるのは依頼人" {
		t.Errorf("hint = %#v", hints[0])
	}
}

func TestClarityDefinition_StanceJumpsToItsProposition(t *testing.T) {
	srv, path := clarityNavServer(t)
	got, ok := dispatchAt(t, srv, "textDocument/definition", 4, 12).(protocol.DefinitionResult)
	if !ok || len(got) != 1 || got[0].URI != "file://"+path {
		t.Fatalf("definition = %#v, want %s", got, path)
	}
}

func TestClarityDefinition_BodyDoesNotJump(t *testing.T) {
	srv, _ := clarityNavServer(t)
	if got, _ := dispatchAt(t, srv, "textDocument/definition", 7, 1).(protocol.DefinitionResult); len(got) != 0 {
		t.Errorf("definition = %#v, want none", got)
	}
}
