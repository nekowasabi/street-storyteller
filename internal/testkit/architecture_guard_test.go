package testkit_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGoMigrationArchitectureCharterExists(t *testing.T) {
	root := findRepoRootForGuard(t)

	docPath := filepath.Join(root, "docs", "architecture.md")
	doc, err := os.ReadFile(docPath)
	if err != nil {
		t.Fatalf("docs/architecture.md must exist: %v", err)
	}

	required := []string{
		"Go/TypeScript Two-Layer Architecture",
		"Layer 1: Go Processing Engine",
		"Layer 2: TypeScript Authoring Surface",
		"E2E Minimalism",
	}
	for _, want := range required {
		if !strings.Contains(string(doc), want) {
			t.Errorf("docs/architecture.md does not contain %q", want)
		}
	}
}

func TestClaudeGuideMentionsTwoLayerArchitecture(t *testing.T) {
	root := findRepoRootForGuard(t)

	doc, err := os.ReadFile(filepath.Join(root, "CLAUDE.md"))
	if err != nil {
		t.Fatalf("read CLAUDE.md: %v", err)
	}
	if !strings.Contains(string(doc), "アーキテクチャ: 二層構造") {
		t.Fatalf("CLAUDE.md must contain the Go/TypeScript two-layer architecture heading")
	}
}
