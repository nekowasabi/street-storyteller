package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

func TestFindReferencesDoesNotDropLongParagraphFiles(t *testing.T) {
	root := makeTestProject(t)
	path := filepath.Join(root, "manuscripts", "long.md")
	content := "勇者アレンは出発した。\r\n" + strings.Repeat("長い文章", 20000) + "勇者アレン\r\n勇者アレンは帰った。"
	writeTestFile(t, path, content)
	refs, err := scanFile(path, []string{"勇者アレン"})
	if err != nil {
		t.Errorf("long paragraph scan failed: %v", err)
	}
	if len(refs) != 3 || refs[0].line != 1 || refs[1].line != 2 || refs[2].line != 3 {
		t.Errorf("long file reference count = %d, want 3", len(refs))
	}
	res, err := (LSPFindReferencesTool{}).Handle(context.Background(), json.RawMessage(`{"entity_type":"character","entity_id":"hero"}`), ExecutionContext{ProjectRoot: root})
	if err != nil || res.IsError {
		t.Fatalf("tool failed: %+v, %v", res, err)
	}
	if !strings.HasPrefix(res.Content[0].Text, "3 references found:") {
		t.Fatalf("tool dropped the long file: %.200s", res.Content[0].Text)
	}
}
