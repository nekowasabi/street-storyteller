package testkit_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGoMigrationInventoryCoversTypeScriptRuntimeModules(t *testing.T) {
	root := findRepoRootForGuard(t)

	docPath := filepath.Join(root, "docs", "go-migration-inventory.md")
	doc, err := os.ReadFile(docPath)
	if err != nil {
		t.Fatalf("docs/go-migration-inventory.md must exist: %v", err)
	}
	text := string(doc)

	for _, dir := range []string{"src/cli/modules", "src/lsp", "src/mcp", "src/rag"} {
		needle := "| `" + dir + "` | retired |"
		if !strings.Contains(text, needle) {
			t.Errorf("inventory does not mark %s retired: want row containing %q", dir, needle)
		}
	}

	if !strings.Contains(text, "```mermaid") {
		t.Errorf("inventory must include a mermaid dependency graph")
	}
	if !strings.Contains(text, "Cycle check") {
		t.Errorf("inventory must document dependency cycle status")
	}
}

func TestInventoryScriptExists(t *testing.T) {
	root := findRepoRootForGuard(t)
	path := filepath.Join(root, "scripts", "inventory.sh")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("scripts/inventory.sh must exist: %v", err)
	}
	if !strings.Contains(string(data), "go-migration-inventory.md") {
		t.Fatalf("scripts/inventory.sh must generate docs/go-migration-inventory.md")
	}
}
