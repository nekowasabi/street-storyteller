package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

func TestLspValidateTool_Definition(t *testing.T) {
	def := LSPValidateTool{}.Definition()
	if def.Name != "lsp_validate" {
		t.Errorf("name = %q", def.Name)
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestLspValidateTool_NoFile_Errors(t *testing.T) {
	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true, got %+v", res)
	}
}

func TestLspValidateTool_LowConfidenceKeepsData(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	writeFile(t, filepath.Join(root, "src", "characters", "hero.ts"), `export const hero = {
  "id": "hero",
  "name": "hero",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "主人公",
  "pronouns": ["彼"]
};`)
	md := filepath.Join(root, "chapter.md")
	writeFile(t, md, "彼は走った\n")

	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	if res.IsError {
		t.Fatalf("tool error: %+v", res)
	}
	text := res.Content[0].Text
	var diags []struct {
		Data *struct {
			Confidence float64 `json:"confidence"`
			EntityID   string  `json:"entityId"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(text), &diags); err != nil {
		t.Fatalf("diagnostics dropped: %v text=%q", err, text)
	}
	if len(diags) != 1 || diags[0].Data == nil {
		t.Fatalf("diags = %#v", diags)
	}
	if diags[0].Data.EntityID != "hero" || diags[0].Data.Confidence != 0.6 {
		t.Fatalf("data = %+v", diags[0].Data)
	}
}

func TestLspValidateTool_EmptyProjectRootUsesWorkingDirectory(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	writeFile(t, filepath.Join(root, "src", "characters", "hero.ts"), `export const hero = {
  "id": "hero",
  "name": "hero",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "主人公",
  "pronouns": ["彼"]
};`)
	md := filepath.Join(root, "chapter.md")
	writeFile(t, md, "彼は走った\n")
	t.Chdir(root)

	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{})
	if err != nil {
		t.Fatal(err)
	}
	if res.IsError {
		t.Fatalf("tool error: %+v", res)
	}
	text := res.Content[0].Text
	var diags []struct {
		Data *struct {
			EntityID string `json:"entityId"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(text), &diags); err != nil {
		t.Fatalf("diagnostics dropped for empty root: %v text=%q", err, text)
	}
	if len(diags) != 1 || diags[0].Data == nil || diags[0].Data.EntityID != "hero" {
		t.Fatalf("diags = %#v", diags)
	}
}

func TestLspValidateTool_DiagnosticErrorIsError(t *testing.T) {
	root := t.TempDir()
	md := filepath.Join(root, "chapter.md")
	writeFile(t, md, "本文\n")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	res, err := LSPValidateTool{}.Handle(ctx, json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	if res == nil || !res.IsError {
		t.Fatalf("want tool error, got %+v", res)
	}
	if len(res.Content) == 0 || res.Content[0].Text == "" {
		t.Fatal("empty error text")
	}
}

func writeHeroProject(t *testing.T, root, manuscript string) string {
	t.Helper()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	writeFile(t, filepath.Join(root, "src", "characters", "hero.ts"), `export const hero = {
  "id": "hero",
  "name": "勇者",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "主人公",
  "pronouns": ["彼"]
};`)
	md := filepath.Join(root, "chapter.md")
	writeFile(t, md, manuscript)
	return md
}

func TestLspValidateTool_RelativeProjectRoot(t *testing.T) {
	parent := t.TempDir()
	md := writeHeroProject(t, filepath.Join(parent, "proj"), "彼は走った\n")
	t.Chdir(parent)

	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{ProjectRoot: "proj"})
	if err != nil {
		t.Fatal(err)
	}
	if got := res.Content[0].Text; !strings.Contains(got, `"entityId":"hero"`) {
		t.Fatalf("relative root lost diagnostics: %q", got)
	}
}

func TestLspValidateTool_FrontmatterBindingSuppressesLowConfidence(t *testing.T) {
	root := t.TempDir()
	md := writeHeroProject(t, root, "---\nstoryteller:\n  characters:\n    - hero\n---\n彼は走った\n")

	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	if got := res.Content[0].Text; strings.Contains(got, "entityId") {
		t.Fatalf("bound entity still diagnosed: %q", got)
	}
}

func TestLspValidateTool_BindingFromMCPToolsSuppressesLowConfidence(t *testing.T) {
	root := t.TempDir()
	md := writeHeroProject(t, root, "彼は走った\n")
	ctx := context.Background()
	ec := ExecutionContext{ProjectRoot: root}
	if res, err := (MetaGenerateTool{}).Handle(ctx, json.RawMessage(`{"path":"`+md+`"}`), ec); err != nil || res.IsError {
		t.Fatalf("meta_generate: %v %+v", err, res)
	}
	if res, err := (ManuscriptBindingTool{}).Handle(ctx, json.RawMessage(`{"manuscript":"`+md+`","action":"add","entityType":"characters","ids":["hero"]}`), ec); err != nil || res.IsError {
		t.Fatalf("manuscript_binding: %v %+v", err, res)
	}

	res, err := LSPValidateTool{}.Handle(ctx, json.RawMessage(`{"file":"`+md+`"}`), ec)
	if err != nil {
		t.Fatal(err)
	}
	if got := res.Content[0].Text; strings.Contains(got, "entityId") {
		t.Fatalf("binding written by manuscript_binding ignored: %q", got)
	}
}

func TestLspValidateTool_InlineBindingSuppressesLowConfidence(t *testing.T) {
	root := t.TempDir()
	md := writeHeroProject(t, root, "---\ncharacters: [hero]\n---\n彼は走った\n")

	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{"file":"`+md+`"}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	if got := res.Content[0].Text; strings.Contains(got, "entityId") {
		t.Fatalf("inline binding ignored: %q", got)
	}
}
