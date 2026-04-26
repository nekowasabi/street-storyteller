package server

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/mcp/tools"
)

// updateMCPGolden triggers golden file regeneration when set.
//
// Why: -update flag pattern keeps golden files as committed source-of-truth
// while allowing one-shot regeneration via `go test -update` (Process 10 wt-2b).
var updateMCPGolden = flag.Bool("update", false, "regenerate MCP wire-protocol golden files (Process 10 wt-2b)")

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

// assertOrUpdateGolden compares the produced canonical JSON to a committed
// golden file under testdata/mcp/. When -update is set the file is written
// (or overwritten) instead of compared.
//
// Why: assertOrUpdateGolden replaces the Red-phase assertGolden stub so that
// `go test -update` is the single command to transition from Red to Green
// (Process 10 wt-2b). Without -update, missing files cause t.Fatal just as
// in the original Red design.
func assertOrUpdateGolden(t *testing.T, goldenName, got string) {
	t.Helper()
	wantPath := filepath.Join("testdata", "mcp", goldenName)
	if *updateMCPGolden {
		if err := os.MkdirAll(filepath.Dir(wantPath), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", filepath.Dir(wantPath), err)
		}
		if err := os.WriteFile(wantPath, []byte(got), 0o644); err != nil {
			t.Fatalf("write golden %s: %v", goldenName, err)
		}
		t.Logf("updated golden: %s", wantPath)
		return
	}
	want, err := os.ReadFile(wantPath)
	if err != nil {
		t.Fatalf("golden %s missing — run `go test -update` to generate\n--- got ---\n%s", goldenName, got)
	}
	if string(want) != got {
		t.Fatalf("golden mismatch for %s\n--- want ---\n%s\n--- got ---\n%s", goldenName, string(want), got)
	}
}

func TestGolden_MCP_InitializeWire(t *testing.T) {
	got := dispatchWire(t, "initialize.json", nil)
	assertOrUpdateGolden(t, "initialize.golden.json", got)
}

func TestGolden_MCP_ToolsListWire(t *testing.T) {
	got := dispatchWire(t, "tools_list.json", func(s *Server) {
		// Why: register the real production tool set so the Golden encodes
		// the public tools/list contract, not a stub.
		_ = s.Tools().Register(tools.MetaCheckTool{})
	})
	assertOrUpdateGolden(t, "tools_list.golden.json", got)
}

func TestGolden_MCP_ToolsCallMetaCheckWire(t *testing.T) {
	got := dispatchWire(t, "tools_call_meta_check.json", func(s *Server) {
		_ = s.Tools().Register(tools.MetaCheckTool{})
	})
	assertOrUpdateGolden(t, "tools_call_meta_check.golden.json", got)
}
