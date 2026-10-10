package testkit_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestProcess05To13ArtifactsExist(t *testing.T) {
	root := findRepoRootForGuard(t)
	for _, rel := range []string{
		"internal/mcp/resources/resources.go",
		"internal/mcp/prompts/prompts.go",
		"scripts/build.sh",
		"scripts/check_binary.sh",
		"docs/test-cleanup-list.md",
	} {
		if _, err := os.Stat(filepath.Join(root, rel)); err != nil {
			t.Errorf("%s must exist: %v", rel, err)
		}
	}
}

func TestCIUsesGoOnly(t *testing.T) {
	root := findRepoRootForGuard(t)
	ci, err := os.ReadFile(filepath.Join(root, ".github", "workflows", "ci.yml"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(ci)
	if !strings.Contains(text, "go test ./...") {
		t.Fatalf("CI must run Go tests")
	}
	// Why: Deno runtime development ends in 2027 (Cloudflare acquisition); no JS runtime may remain in CI.
	if strings.Contains(strings.ToLower(text), "deno") || strings.Contains(text, "tests/cli_") {
		t.Fatalf("CI must not depend on Deno")
	}
	if strings.Contains(text, "rag ") || strings.Contains(text, "rag_") || strings.Contains(text, "RAG") {
		t.Fatalf("CI must not reference retired RAG workflows")
	}
	if _, err := os.Stat(filepath.Join(root, "deno.json")); err == nil {
		t.Fatalf("deno.json must be retired")
	}
}
