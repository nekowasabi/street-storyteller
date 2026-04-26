package testkit_test

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTypeScriptRuntimeModulesAreRetired(t *testing.T) {
	root := findRepoRootForGuard(t)
	for _, rel := range []string{
		"src/cli/modules",
		"src/cli.ts",
		"src/lsp",
		"src/mcp",
		"src/rag",
	} {
		if _, err := os.Stat(filepath.Join(root, rel)); err == nil {
			t.Fatalf("%s should be retired from src/", rel)
		}
	}
	for _, rel := range []string{
		"src/type",
		"src/characters",
		"src/settings",
		"src/timelines",
		"samples",
	} {
		if _, err := os.Stat(filepath.Join(root, rel)); err != nil {
			t.Fatalf("authoring surface %s must remain: %v", rel, err)
		}
	}
}
