package server

// LSP wire-protocol Golden tests (Process 10 wt-2a).
//
// Why a dedicated file: server_test.go already exercises behavior with
// hand-rolled assertions (HoverProvider==true, content contains "勇者"). The
// Golden tests below pin the *exact* JSON-RPC response body byte shape against
// testdata/lsp/*_response.json so any drift in field order, capability set, or
// payload structure is caught at the contract boundary.
//
// Why canonicalize via json.Unmarshal+MarshalIndent: Go's encoding/json emits
// struct fields in declaration order and map keys in lexicographic order;
// testdata fixtures are authored by hand. Round-tripping both sides through
// the same canonical form removes incidental whitespace / key-ordering
// differences while preserving semantic equality.

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// canonicalizeJSON re-serializes raw JSON with sorted map keys and stable
// indent so two semantically-equal documents compare byte-equal.
func canonicalizeJSON(t *testing.T, raw []byte) string {
	t.Helper()
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, raw)
	}
	out, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatalf("marshal canonical: %v", err)
	}
	return string(out)
}

// findResponseByID extracts the response frame whose JSON-RPC id matches
// wantID. Notifications (id == nil) are skipped.
func findResponseByID(t *testing.T, msgs []*protocol.Message, wantID int) *protocol.Message {
	t.Helper()
	for _, m := range msgs {
		if m.ID == nil {
			continue
		}
		var got int
		if err := json.Unmarshal(m.ID, &got); err != nil {
			continue
		}
		if got == wantID {
			return m
		}
	}
	t.Fatalf("response with id=%d not found among %d frames", wantID, len(msgs))
	return nil
}

// reencodeFrame produces the canonical JSON-RPC body bytes for msg by
// emitting only the wire fields (jsonrpc/id/result/error) so the comparison
// is symmetric with the testdata fixtures (which omit method/params).
//
// Why not protocol.Write: protocol.Write prepends the Content-Length header
// and we already stripped framing on the way in.
func reencodeFrame(t *testing.T, msg *protocol.Message) []byte {
	t.Helper()
	out := map[string]any{
		"jsonrpc": msg.JSONRPC,
	}
	if msg.ID != nil {
		// Why pass-through json.RawMessage: keeps numeric vs string id shape
		// exactly as the client sent it.
		out["id"] = json.RawMessage(msg.ID)
	}
	if msg.Result != nil {
		out["result"] = json.RawMessage(msg.Result)
	}
	if msg.Error != nil {
		out["error"] = msg.Error
	}
	b, err := json.Marshal(out)
	if err != nil {
		t.Fatalf("reencode frame: %v", err)
	}
	return b
}

func TestGolden_LSP_InitializeWire(t *testing.T) {
	in := bytes.NewBuffer(frameBody(loadFixture(t, "initialize_request.json")))
	var out bytes.Buffer

	srv := NewServer(ServerOptions{
		Clock: clock.NewFakeClock(time.Unix(0, 0)),
	})
	srv.RegisterStandardHandlers()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := srv.Run(ctx, in, &out); err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	resps := readAllResponses(t, &out)
	resp := findResponseByID(t, resps, 1)

	gotBody := reencodeFrame(t, resp)
	wantBody := loadFixture(t, "initialize_response.json")

	got := canonicalizeJSON(t, gotBody)
	want := canonicalizeJSON(t, wantBody)

	if got != want {
		t.Errorf("initialize wire mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

func TestGolden_LSP_HoverWire(t *testing.T) {
	var in bytes.Buffer
	in.Write(frameBody(loadFixture(t, "initialize_request.json")))
	in.Write(frameBody(loadFixture(t, "did_open_notification.json")))
	in.Write(frameBody(loadFixture(t, "hover_request.json")))

	var out bytes.Buffer

	srv := NewServer(ServerOptions{
		Catalog:    fakeCatalog{},
		Lookup:     fakeLookup{},
		Locator:    fakeLocator{},
		Aggregator: &diagnostics.Aggregator{},
		Clock:      clock.NewFakeClock(time.Unix(0, 0)),
	})
	srv.RegisterStandardHandlers()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := srv.Run(ctx, &in, &out); err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	resps := readAllResponses(t, &out)
	resp := findResponseByID(t, resps, 2)

	gotBody := reencodeFrame(t, resp)
	wantBody := loadFixture(t, "hover_response.json")

	got := canonicalizeJSON(t, gotBody)
	want := canonicalizeJSON(t, wantBody)

	if got != want {
		t.Errorf("hover wire mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}
