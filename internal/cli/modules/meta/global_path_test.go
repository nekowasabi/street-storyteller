package meta

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestMetaCheckHonorsPathThroughCLI(t *testing.T) {
	for _, form := range []string{"separate", "equals", "before-command"} {
		t.Run(form, func(t *testing.T) {
			root := t.TempDir()
			if err := os.WriteFile(filepath.Join(root, "chapter.md"), []byte("# Chapter\n"), 0644); err != nil {
				t.Fatal(err)
			}
			registry := cli.NewRegistry()
			if err := registry.Register("meta check", New()); err != nil {
				t.Fatal(err)
			}
			args := []string{"meta", "check", "--path", root, "--json"}
			if form == "equals" {
				args = []string{"meta", "check", "--path=" + root, "--json"}
			} else if form == "before-command" {
				args = []string{"--path", root, "meta", "check", "--json"}
			}
			var out, stderr bytes.Buffer
			if code := cli.RunWithRegistry(context.Background(), args, cli.Deps{Stdout: &out, Stderr: &stderr}, registry); code != 0 {
				t.Fatalf("exit=%d stderr=%q stdout=%q", code, stderr.String(), out.String())
			}
			var result struct {
				FilesChecked int `json:"files_checked"`
			}
			if err := json.Unmarshal(out.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.FilesChecked != 1 {
				t.Fatalf("checked %d files, want the specified manuscript directory", result.FilesChecked)
			}
		})
	}
}
