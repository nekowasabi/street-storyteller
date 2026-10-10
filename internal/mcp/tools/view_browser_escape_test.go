package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

func TestViewBrowserEscapesAuthoredText(t *testing.T) {
	for _, kind := range []string{"character", "setting"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
			entity := map[string]any{"id": "hero", "name": "<勇者> & friends", "summary": `A < B & "quoted" <script>alert(1)</script>`, "appearingChapters": []string{}}
			if kind == "character" {
				entity["role"] = "protagonist"
				entity["traits"] = []string{}
				entity["relationships"] = map[string]string{}
			} else {
				entity["type"] = "location"
			}
			raw, _ := json.Marshal(entity)
			writeFile(t, filepath.Join(root, "src", kind+"s", "hero.ts"), "export const hero = "+string(raw)+";")
			args, _ := json.Marshal(map[string]string{"entity": kind, "id": "hero"})
			got, err := (ViewBrowserTool{}).Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
			if err != nil || got.IsError {
				t.Fatalf("Handle: %v %+v", err, got)
			}
			rendered := got.Content[0].Text
			if !strings.Contains(rendered, "<h1>&lt;勇者&gt; &amp; friends</h1>") {
				t.Errorf("name not escaped: %s", rendered)
			}
			if strings.Contains(rendered, "<script>") || !strings.Contains(rendered, "&lt;script&gt;") || !strings.Contains(rendered, "A &lt; B &amp;") {
				t.Errorf("summary not escaped: %s", rendered)
			}
		})
	}
}
