package server

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/mcp/tools"
)

// loadGoldenBytes reads testdata/mcp/<name> as raw bytes.
//
// Why: separated from JSON parsing so we can both (a) feed the request
// fixture through the wire and (b) read the *.golden.json contract file
// without forcing a structural Unmarshal at load time.
func loadGoldenBytes(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", "mcp", name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return b
}

// canonicalizeJSON normalises whitespace/key ordering so Golden comparisons
// are stable across encoder changes.
//
// Why: json.MarshalIndent on a generic any preserves map-key sort order
// (Go's encoding/json sorts map keys), which is the canonical form we
// commit to disk for wire-protocol Golden contracts.
func canonicalizeJSON(t *testing.T, raw []byte) string {
	t.Helper()
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, raw)
	}
	out, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(out)
}

// dispatchWire feeds the given request fixture through a real Server.Run
// loop and returns the canonicalized JSON of the response Message.
//
// Why: exercises Read/Write framing + Dispatcher together so the Golden
// captures the full wire contract, not just the handler return value.
func dispatchWire(t *testing.T, requestFixture string, configure func(s *Server)) string {
	t.Helper()
	body := loadGoldenBytes(t, requestFixture)

	msg := &protocol.Message{}
	if err := json.Unmarshal(body, msg); err != nil {
		t.Fatalf("parse request fixture %s: %v", requestFixture, err)
	}

	var inBuf bytes.Buffer
	if err := protocol.Write(&inBuf, msg); err != nil {
		t.Fatalf("frame request: %v", err)
	}

	s := New(ServerOptions{Name: "test-server", Version: "0.0.1"})
	s.RegisterStandardHandlers()
	if configure != nil {
		configure(s)
	}

	var outBuf bytes.Buffer
	_ = s.Run(context.Background(), &inBuf, &outBuf)

	resp, err := protocol.Read(&outBuf)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	rawResp, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	return canonicalizeJSON(t, rawResp)
}

// assertGolden compares the produced canonical JSON to a committed Golden
// file under testdata/mcp/. In Red phase the *.golden.json files do not
// exist yet, so this fails as designed.
func assertGolden(t *testing.T, goldenName, got string) {
	t.Helper()
	wantPath := filepath.Join("testdata", "mcp", goldenName)
	want, err := os.ReadFile(wantPath)
	if err != nil {
		t.Fatalf("Red phase: golden %s missing (%v)\n--- got ---\n%s", goldenName, err, got)
	}
	if string(want) != got {
		t.Fatalf("Golden mismatch for %s\n--- want ---\n%s\n--- got ---\n%s", goldenName, string(want), got)
	}
}

func TestGolden_MCP_InitializeWire(t *testing.T) {
	got := dispatchWire(t, "initialize.json", nil)
	assertGolden(t, "initialize.golden.json", got)
}

func TestGolden_MCP_ToolsListWire(t *testing.T) {
	got := dispatchWire(t, "tools_list.json", func(s *Server) {
		// Why: register the real production tool set so the Golden encodes
		// the public tools/list contract, not a stub.
		_ = s.Tools().Register(tools.MetaCheckTool{})
	})
	assertGolden(t, "tools_list.golden.json", got)
}

func TestGolden_MCP_ToolsCallMetaCheckWire(t *testing.T) {
	got := dispatchWire(t, "tools_call_meta_check.json", func(s *Server) {
		_ = s.Tools().Register(tools.MetaCheckTool{})
	})
	assertGolden(t, "tools_call_meta_check.golden.json", got)
}
