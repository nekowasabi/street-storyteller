package server

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

func TestNewServerOptions_EmptyProjectReturnsUsableFallback(t *testing.T) {
	root := t.TempDir()
	opts, err := NewServerOptions(context.Background(), "file://"+root)
	if err != nil {
		t.Fatalf("NewServerOptions error: %v", err)
	}
	if opts.Aggregator == nil {
		t.Fatal("Aggregator = nil")
	}
	if opts.Catalog == nil {
		t.Fatal("Catalog = nil, want empty fallback catalog")
	}
	if opts.Lookup == nil {
		t.Fatal("Lookup = nil")
	}
	if opts.Locator == nil {
		t.Fatal("Locator = nil")
	}
}

func TestNewServerOptions_LoadsProjectEntities(t *testing.T) {
	root := t.TempDir()
	writeHeroProject(t, root)

	opts, err := NewServerOptions(context.Background(), "file://"+root)
	if err != nil {
		t.Fatalf("NewServerOptions error: %v", err)
	}
	ref, src, ok := opts.Catalog.FindByName("勇者")
	if !ok {
		t.Fatal("FindByName did not find 勇者")
	}
	if ref != (detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}) {
		t.Fatalf("ref = %+v, want character hero", ref)
	}
	if src != detect.SourceName {
		t.Fatalf("source = %q, want name", src)
	}
	info, ok := opts.Lookup.Lookup(ref)
	if !ok || info.Summary != "主人公" {
		t.Fatalf("Lookup = %+v, %v", info, ok)
	}
	loc, ok := opts.Locator.Locate(ref)
	if !ok {
		t.Fatal("Locate did not find hero")
	}
	if loc.URI != "file://"+filepath.Join(root, "src", "characters", "hero.ts") {
		t.Fatalf("location URI = %q", loc.URI)
	}
	if loc.Range != (protocol.Range{}) {
		t.Fatalf("location range = %+v, want zero range", loc.Range)
	}
}

func TestServer_InitializeRootURIReconfiguresProjectDependencies(t *testing.T) {
	root := t.TempDir()
	writeHeroProject(t, root)

	initReq := []byte(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"rootUri":"file://` + root + `","capabilities":{}}}`)
	openReq := []byte(`{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"file:///chapter.md","languageId":"markdown","version":1,"text":"勇者は走った。"}}}`)
	hoverReq := []byte(`{"jsonrpc":"2.0","id":2,"method":"textDocument/hover","params":{"textDocument":{"uri":"file:///chapter.md"},"position":{"line":0,"character":1}}}`)

	var in bytes.Buffer
	in.Write(frameBody(initReq))
	in.Write(frameBody(openReq))
	in.Write(frameBody(hoverReq))
	var out bytes.Buffer

	srv := NewServer(ServerOptions{UseInitializeRoot: true})
	srv.RegisterStandardHandlers()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := srv.Run(ctx, &in, &out); err != nil {
		t.Fatalf("Run returned error: %v", err)
	}
	resp := findResponseByID(t, readAllResponses(t, &out), 2)
	if resp.Error != nil {
		t.Fatalf("hover error response: %+v", resp.Error)
	}
	var got protocol.HoverResult
	if err := json.Unmarshal(resp.Result, &got); err != nil {
		t.Fatalf("decode hover: %v raw=%s", err, string(resp.Result))
	}
	if got.Contents.Value == "" {
		t.Fatalf("hover content is empty; rootUri did not populate lookup")
	}
}

func writeHeroProject(t *testing.T, root string) {
	t.Helper()
	mustWrite(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	mustWrite(t, filepath.Join(root, "src", "characters", "hero.ts"), `export const hero = {
  "id": "hero",
  "name": "勇者",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "主人公"
};`)
}

func mustWrite(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}
