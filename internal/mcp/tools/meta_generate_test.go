package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMetaGenerateTool_Definition(t *testing.T) {
	def := MetaGenerateTool{}.Definition()
	if def.Name != "meta_generate" {
		t.Errorf("name = %q", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestMetaGenerateTool_Handle_MissingPath(t *testing.T) {
	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing path")
	}
}

func TestMetaGenerateTool_Handle_NonExistentPath(t *testing.T) {
	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{"path":"/nonexistent/path/file.md"}`), ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for non-existent path")
	}
}

func TestMetaGenerateTool_Handle_SingleFile_NoFrontmatter(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "chapter01.md")
	if err := os.WriteFile(mdPath, []byte("# Chapter 1\n\nSome content here.\n"), 0644); err != nil {
		t.Fatal(err)
	}

	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{"path":"`+mdPath+`"}`), ExecutionContext{ProjectRoot: dir})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	if !strings.Contains(res.Content[0].Text, "frontmatter generated: 1 files") {
		t.Errorf("text = %q", res.Content[0].Text)
	}

	// Verify frontmatter was actually written
	content, err := os.ReadFile(mdPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(content), "---\n") {
		t.Errorf("frontmatter not inserted, content starts with: %q", string(content)[:min(50, len(content))])
	}
	if !strings.Contains(string(content), "characters: []") {
		t.Errorf("frontmatter missing characters field")
	}
}

func TestMetaGenerateTool_Handle_SingleFile_AlreadyHasFrontmatter(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "chapter02.md")
	existing := "---\ncharacters: [hero]\n---\n\n# Chapter 2\n"
	if err := os.WriteFile(mdPath, []byte(existing), 0644); err != nil {
		t.Fatal(err)
	}

	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{"path":"`+mdPath+`"}`), ExecutionContext{ProjectRoot: dir})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	// Skip because frontmatter already exists
	if !strings.Contains(res.Content[0].Text, "frontmatter generated: 0 files") {
		t.Errorf("text = %q", res.Content[0].Text)
	}

	// Verify file unchanged
	content, err := os.ReadFile(mdPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != existing {
		t.Errorf("file was modified but should not have been")
	}
}

func TestMetaGenerateTool_Handle_Directory(t *testing.T) {
	dir := t.TempDir()
	// Create subdirectory with .md files
	subDir := filepath.Join(dir, "manuscripts")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}

	files := []struct {
		name    string
		content string
	}{
		{"chapter01.md", "# Chapter 1\n"},
		{"chapter02.md", "# Chapter 2\n"},
		{"chapter03.md", "---\nexisting: true\n---\n# Chapter 3\n"},
	}
	for _, f := range files {
		if err := os.WriteFile(filepath.Join(subDir, f.name), []byte(f.content), 0644); err != nil {
			t.Fatal(err)
		}
	}

	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{"path":"`+subDir+`"}`), ExecutionContext{ProjectRoot: dir})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	// 2 files without frontmatter should be processed
	if !strings.Contains(res.Content[0].Text, "frontmatter generated: 2 files") {
		t.Errorf("text = %q", res.Content[0].Text)
	}
}

func TestMetaGenerateTool_Handle_Directory_Recursive(t *testing.T) {
	dir := t.TempDir()
	nested := filepath.Join(dir, "a", "b")
	if err := os.MkdirAll(nested, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(nested, "deep.md"), []byte("# Deep\n"), 0644); err != nil {
		t.Fatal(err)
	}

	res, err := MetaGenerateTool{}.Handle(context.Background(), json.RawMessage(`{"path":"`+dir+`"}`), ExecutionContext{ProjectRoot: dir})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	if !strings.Contains(res.Content[0].Text, "frontmatter generated: 1 files") {
		t.Errorf("text = %q", res.Content[0].Text)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
