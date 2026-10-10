package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/meta"
)

func TestMetaGenerateCreatesCanonicalParseableFrontmatter(t *testing.T) {
	for _, body := range []string{"# Chapter\n本文\n", "# Chapter\r\n本文\r\n", ""} {
		root := t.TempDir()
		path := filepath.Join(root, "chapter.md")
		if err := os.WriteFile(path, []byte(body), 0644); err != nil {
			t.Fatal(err)
		}
		args, _ := json.Marshal(map[string]string{"path": path})
		res, err := (MetaGenerateTool{}).Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
		if err != nil || res.IsError {
			t.Fatalf("generate failed: %+v, %v", res, err)
		}
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		doc, err := meta.Parse(content)
		if err != nil {
			t.Fatalf("generated frontmatter rejected: %v; content=%s", err, content)
		}
		if !doc.HasFrontMatter || doc.Body != body || !strings.Contains(string(content), "storyteller:\n  characters: []") {
			t.Fatalf("incorrect canonical output: %s", content)
		}
		res, err = (MetaGenerateTool{}).Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
		if err != nil || res.IsError {
			t.Fatalf("second generate failed: %+v, %v", res, err)
		}
		again, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if string(again) != string(content) {
			t.Fatal("repeat generation changed authored content")
		}
	}
}
