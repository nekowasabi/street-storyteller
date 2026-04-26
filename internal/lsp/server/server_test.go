package server

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
	"github.com/takets/street-storyteller/internal/lsp/providers"
	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// frameBody wraps body bytes in a single Content-Length framed message.
func frameBody(body []byte) []byte {
	return []byte(fmt.Sprintf("Content-Length: %d\r\n\r\n%s", len(body), body))
}

// loadFixture reads a body-only JSON fixture from testdata/lsp.
func loadFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("testdata", "lsp", name)
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	// Strip trailing newline so Content-Length matches exactly.
	return bytes.TrimRight(b, "\r\n")
}

// readAllResponses parses every framed Message from buf until EOF.
//
// Why bufio wrap once: protocol.Read creates a fresh bufio.Reader on every
// call, so passing the raw bytes.Buffer would discard whatever bytes the
// previous Read prefetched. Wrapping once and reusing keeps the cursor
// consistent across frames.
func readAllResponses(t *testing.T, buf *bytes.Buffer) []*protocol.Message {
	t.Helper()
	br := bufio.NewReader(buf)
	out := []*protocol.Message{}
	for {
		_, err := br.Peek(1)
		if err != nil {
			return out
		}
		msg, err := protocol.Read(br)
		if err != nil {
			t.Fatalf("parse response frame: %v", err)
		}
		out = append(out, msg)
	}
}

func TestServer_InitializeReturnsCapabilities(t *testing.T) {
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
	if len(resps) != 1 {
		t.Fatalf("expected 1 response frame, got %d", len(resps))
	}
	resp := resps[0]
	if resp.Error != nil {
		t.Fatalf("unexpected error response: %+v", resp.Error)
	}
	var result protocol.InitializeResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		t.Fatalf("decode initialize result: %v (raw=%s)", err, string(resp.Result))
	}
	if !result.Capabilities.HoverProvider {
		t.Errorf("HoverProvider = false, want true")
	}
	if !result.Capabilities.DefinitionProvider {
		t.Errorf("DefinitionProvider = false, want true")
	}
	if result.Capabilities.TextDocumentSync != 1 {
		t.Errorf("TextDocumentSync = %d, want 1", result.Capabilities.TextDocumentSync)
	}
	if result.Capabilities.SemanticTokensProvider == nil {
		t.Fatalf("SemanticTokensProvider = nil, want non-nil")
	}
	if result.ServerInfo == nil || result.ServerInfo.Name != "storyteller-lsp" {
		t.Errorf("ServerInfo = %+v, want name storyteller-lsp", result.ServerInfo)
	}
}

// fakeCatalog is a minimal EntityCatalog that knows a single character
// "勇者" -> hero.
type fakeCatalog struct{}

func (fakeCatalog) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	if kind == detect.EntityCharacter && id == "hero" {
		return detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, true
	}
	return detect.EntityRef{}, false
}

func (fakeCatalog) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	if name == "勇者" {
		return detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourceName, true
	}
	return detect.EntityRef{}, "", false
}

func (fakeCatalog) ListNames(kind detect.EntityKind) []string {
	if kind == detect.EntityCharacter {
		return []string{"勇者"}
	}
	return nil
}

type fakeLookup struct{}

func (fakeLookup) Lookup(ref detect.EntityRef) (providers.EntityInfo, bool) {
	if ref.Kind == detect.EntityCharacter && ref.ID == "hero" {
		return providers.EntityInfo{Name: "勇者", Kind: "character", Summary: "主人公"}, true
	}
	return providers.EntityInfo{}, false
}

type fakeLocator struct{}

func (fakeLocator) Locate(ref detect.EntityRef) (protocol.Location, bool) {
	return protocol.Location{}, false
}

func TestServer_HoverFlow_OpenDidChangeHover(t *testing.T) {
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
	// Expect: initialize response (id=1) + hover response (id=2).
	// publishDiagnostics is also written but Aggregator has no sources
	// so it MAY be emitted with an empty array; either case is acceptable
	// as long as the two ID-bearing responses are present.
	var initResp, hoverResp *protocol.Message
	for _, r := range resps {
		if r.ID == nil {
			continue
		}
		var idNum int
		if err := json.Unmarshal(r.ID, &idNum); err != nil {
			continue
		}
		switch idNum {
		case 1:
			initResp = r
		case 2:
			hoverResp = r
		}
	}
	if initResp == nil {
		t.Fatalf("initialize response missing; got %d frames", len(resps))
	}
	if hoverResp == nil {
		t.Fatalf("hover response missing; got %d frames", len(resps))
	}
	if hoverResp.Error != nil {
		t.Fatalf("hover error response: %+v", hoverResp.Error)
	}
	var hr protocol.HoverResult
	if err := json.Unmarshal(hoverResp.Result, &hr); err != nil {
		t.Fatalf("decode hover result: %v (raw=%s)", err, string(hoverResp.Result))
	}
	if !strings.Contains(hr.Contents.Value, "勇者") {
		t.Errorf("hover content %q does not contain 勇者", hr.Contents.Value)
	}
}
