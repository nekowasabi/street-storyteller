package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestManuscriptToolsResolvePathsAgainstProject(t *testing.T) {
	for _, tc := range []struct {
		tool            Tool
		key, path, want string
	}{
		{MetaGenerateTool{}, "path", "manuscripts/chapter.md", "frontmatter generated: 1 files"},
		{MetaCheckTool{}, "path", "manuscripts", "1 files validated"},
		{LSPValidateTool{}, "file", "manuscripts/chapter.md", "1 entities detected"},
		{LSPFindReferencesTool{}, "root", "manuscripts", "1 references found:"},
	} {
		for _, absolute := range []bool{false, true} {
			mode := "relative"
			if absolute {
				mode = "absolute"
			}
			t.Run(tc.tool.Definition().Name+"/"+mode, func(t *testing.T) {
				root := makeTestProject(t)
				other := t.TempDir()
				t.Chdir(other)
				projectFile := filepath.Join(root, "manuscripts", "chapter.md")
				decoyFile := filepath.Join(other, "manuscripts", "chapter.md")
				writeTestFile(t, projectFile, "勇者\n")
				decoy := "---\ninvalid: true\n---\nUnrelated\n"
				if tc.tool.Definition().Name == "meta_generate" {
					decoy = "Unrelated draft\n"
				}
				writeTestFile(t, decoyFile, decoy)
				path := tc.path
				if absolute {
					path = filepath.Join(root, path)
				}
				args, _ := json.Marshal(map[string]string{tc.key: path, "entity_type": "character", "entity_id": "hero"})
				res, err := tc.tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: root})
				if err != nil || res.IsError || !strings.Contains(res.Content[0].Text, tc.want) {
					t.Errorf("wrong project result: %+v, %v", res, err)
				}
				unchanged, err := os.ReadFile(decoyFile)
				if err != nil {
					t.Fatal(err)
				}
				if string(unchanged) != decoy {
					t.Error("tool modified unrelated working-directory manuscript")
				}
				if tc.tool.Definition().Name == "meta_generate" {
					content, err := os.ReadFile(projectFile)
					if err != nil {
						t.Fatal(err)
					}
					if !strings.HasPrefix(string(content), "---\n") {
						t.Error("project manuscript was not updated")
					}
				}
			})
		}
	}
}
