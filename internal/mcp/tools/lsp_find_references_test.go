package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// --- fixtures ----------------------------------------------------------------

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdirall %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

const testMinimalManifest = `{"version":"1.0.0"}`

func makeTestProject(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	writeTestFile(t, filepath.Join(root, ".storyteller.json"), testMinimalManifest)
	writeTestFile(t, filepath.Join(root, "src", "characters", "hero.ts"),
		`export const hero = {
  "id": "hero",
  "name": "勇者",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "テスト用キャラクター",
  "displayNames": ["ヒーロー", "英雄"]
};`)
	writeTestFile(t, filepath.Join(root, "src", "settings", "town.ts"),
		`export const town = {
  "id": "town",
  "name": "王都",
  "type": "location",
  "appearingChapters": [],
  "summary": "テスト用設定",
  "displayNames": ["城下町"]
};`)
	return root
}

// --- Definition --------------------------------------------------------------

func TestLspFindReferencesTool_Definition(t *testing.T) {
	def := LSPFindReferencesTool{}.Definition()
	if def.Name != "lsp_find_references" {
		t.Errorf("name = %q, want lsp_find_references", def.Name)
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema is empty")
	}
}

// --- Error cases -------------------------------------------------------------

func TestLspFindReferencesTool_MissingEntityType_IsError(t *testing.T) {
	root := makeTestProject(t)
	args := json.RawMessage(`{"entity_id":"hero"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing entity_type")
	}
}

func TestLspFindReferencesTool_MissingEntityID_IsError(t *testing.T) {
	root := makeTestProject(t)
	args := json.RawMessage(`{"entity_type":"character"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing entity_id")
	}
}

func TestLspFindReferencesTool_InvalidEntityType_IsError(t *testing.T) {
	root := makeTestProject(t)
	args := json.RawMessage(`{"entity_type":"foreshadowing","entity_id":"x"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for invalid entity_type")
	}
}

func TestLspFindReferencesTool_EntityNotFound_IsError(t *testing.T) {
	root := makeTestProject(t)
	args := json.RawMessage(`{"entity_type":"character","entity_id":"nonexistent"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for nonexistent entity")
	}
}

func TestLspFindReferencesTool_BadProjectRoot_IsError(t *testing.T) {
	args := json.RawMessage(`{"entity_type":"character","entity_id":"hero"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: "/nonexistent/path"})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for bad project root")
	}
}

// --- Success cases -----------------------------------------------------------

func TestLspFindReferencesTool_CharacterFound(t *testing.T) {
	root := makeTestProject(t)

	// Write manuscripts with character references
	writeTestFile(t, filepath.Join(root, "manuscripts", "ch01.md"),
		"# 第一章\n\n勇者は剣を抜いた。\nヒーローは前へ進んだ。\n関係ない行。\n")
	writeTestFile(t, filepath.Join(root, "manuscripts", "ch02.md"),
		"# 第二章\n\n英雄は戻ってきた。\n")

	args := json.RawMessage(`{"entity_type":"character","entity_id":"hero"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected error: %+v", res.Content)
	}
	if len(res.Content) == 0 {
		t.Fatal("expected content, got empty")
	}
	text := res.Content[0].Text
	// Should find references in both files
	if !strings.Contains(text, "references found") {
		t.Errorf("output missing 'references found': %q", text)
	}
	if !strings.Contains(text, "ch01.md") {
		t.Errorf("output missing ch01.md: %q", text)
	}
	if !strings.Contains(text, "ch02.md") {
		t.Errorf("output missing ch02.md: %q", text)
	}
}

func TestLspFindReferencesTool_SettingFound(t *testing.T) {
	root := makeTestProject(t)

	writeTestFile(t, filepath.Join(root, "manuscripts", "ch01.md"),
		"# 第一章\n\n王都の城門前で待ち合わせた。\n城下町は静かだった。\n")

	args := json.RawMessage(`{"entity_type":"setting","entity_id":"town"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected error: %+v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "references found") {
		t.Errorf("output missing 'references found': %q", text)
	}
}

func TestLspFindReferencesTool_NoReferences(t *testing.T) {
	root := makeTestProject(t)

	writeTestFile(t, filepath.Join(root, "manuscripts", "ch01.md"),
		"# 第一章\n\n全く関係ない内容。\n")

	args := json.RawMessage(`{"entity_type":"character","entity_id":"hero"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected error: %+v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "0 references") {
		t.Errorf("expected '0 references', got: %q", text)
	}
}

func TestLspFindReferencesTool_CustomRoot(t *testing.T) {
	root := makeTestProject(t)

	// Write to custom directory instead of default manuscripts/
	customDir := filepath.Join(root, "custom_docs")
	writeTestFile(t, filepath.Join(customDir, "ch01.md"),
		"勇者が現れた。\n")

	argsStr := `{"entity_type":"character","entity_id":"hero","root":"` + customDir + `"}`
	args := json.RawMessage(argsStr)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected error: %+v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "references found") {
		t.Errorf("output missing 'references found': %q", text)
	}
}

func TestLspFindReferencesTool_LineNumbers(t *testing.T) {
	root := makeTestProject(t)

	writeTestFile(t, filepath.Join(root, "manuscripts", "ch01.md"),
		"# タイトル\n\n空行\n\n勇者は現れた。\n")

	args := json.RawMessage(`{"entity_type":"character","entity_id":"hero"}`)
	res, err := LSPFindReferencesTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected error: %+v", res.Content)
	}
	text := res.Content[0].Text
	// Line 5 contains "勇者は現れた。"
	if !strings.Contains(text, ":5:") {
		t.Errorf("expected line number :5: in output: %q", text)
	}
}
