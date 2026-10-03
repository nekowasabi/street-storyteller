package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
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
