package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestForeshadowingViewTool_Definition(t *testing.T) {
	def := ForeshadowingViewTool{}.Definition()
	if def.Name != "foreshadowing_view" {
		t.Errorf("name = %q, want %q", def.Name, "foreshadowing_view")
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

// newForeshadowingProjectWithEntities creates a project dir with a foreshadowing TS fixture.
func newForeshadowingProjectWithEntities(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	dir := filepath.Join(root, "src", "foreshadowings")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	// Two foreshadowings: one planted, one resolved
	writeFile(t, filepath.Join(dir, "ancient_sword.ts"), `
export const ancient_sword = {
  "id": "ancient_sword",
  "name": "古びた剣",
  "type": "chekhov",
  "summary": "床板の下に隠された剣",
  "planting": {
    "chapter": "chapter_01",
    "description": "床板の下から発見"
  },
  "status": "planted"
};
`)
	writeFile(t, filepath.Join(dir, "prophecy.ts"), `
export const prophecy = {
  "id": "prophecy",
  "name": "古の予言",
  "type": "prophecy",
  "summary": "神殿に刻まれた予言",
  "planting": {
    "chapter": "chapter_02",
    "description": "予言が告げられる"
  },
  "status": "resolved"
};
`)
	return root
}

func TestForeshadowingViewTool_Handle_List(t *testing.T) {
	root := newForeshadowingProjectWithEntities(t)
	ec := ExecutionContext{ProjectRoot: root}

	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "ancient_sword") {
		t.Errorf("expected 'ancient_sword' in list output, got %q", text)
	}
	if !strings.Contains(text, "prophecy") {
		t.Errorf("expected 'prophecy' in list output, got %q", text)
	}
}

func TestForeshadowingViewTool_Handle_ListFilterStatus(t *testing.T) {
	root := newForeshadowingProjectWithEntities(t)
	ec := ExecutionContext{ProjectRoot: root}

	// Filter to planted only
	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{"status":"planted"}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "ancient_sword") {
		t.Errorf("expected 'ancient_sword' in planted filter, got %q", text)
	}
	if strings.Contains(text, "prophecy") {
		t.Errorf("expected 'prophecy' to be filtered out from planted results, got %q", text)
	}
}

func TestForeshadowingViewTool_Handle_GetByID(t *testing.T) {
	root := newForeshadowingProjectWithEntities(t)
	ec := ExecutionContext{ProjectRoot: root}

	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{"id":"ancient_sword"}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "古びた剣") {
		t.Errorf("expected name '古びた剣' in detail output, got %q", text)
	}
	if !strings.Contains(text, "chekhov") {
		t.Errorf("expected type 'chekhov' in detail output, got %q", text)
	}
	if !strings.Contains(text, "planted") {
		t.Errorf("expected status 'planted' in detail output, got %q", text)
	}
}

func TestForeshadowingViewTool_Handle_GetByID_NotFound(t *testing.T) {
	root := newForeshadowingProjectWithEntities(t)
	ec := ExecutionContext{ProjectRoot: root}

	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{"id":"nonexistent"}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing id, got: %s", res.Content[0].Text)
	}
}

func TestForeshadowingViewTool_Handle_ProjectLoadError(t *testing.T) {
	ec := ExecutionContext{ProjectRoot: "/nonexistent/path"}

	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true when project fails to load")
	}
}

func TestForeshadowingViewTool_Handle_EmptyProject(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	res, err := ForeshadowingViewTool{}.Handle(context.Background(), json.RawMessage(`{}`), ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError for empty project: %s", res.Content[0].Text)
	}
	// Should still return something (e.g. "0 foreshadowings")
	if len(res.Content) == 0 {
		t.Error("expected content even for empty project")
	}
}
