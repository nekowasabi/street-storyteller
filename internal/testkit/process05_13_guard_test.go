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

func TestCIUsesGoMainAndDenoAuthoringOnly(t *testing.T) {
	root := findRepoRootForGuard(t)
	ci, err := os.ReadFile(filepath.Join(root, ".github", "workflows", "ci.yml"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(ci)
	if !strings.Contains(text, "go test ./...") {
		t.Fatalf("CI must run Go tests")
	}
	if strings.Contains(text, "deno task test\n") || strings.Contains(text, "tests/cli_") {
		t.Fatalf("CI must not run the legacy full Deno/E2E suite")
	}
	if strings.Contains(text, "rag ") || strings.Contains(text, "rag_") || strings.Contains(text, "RAG") {
		t.Fatalf("CI must not reference retired RAG workflows")
	}
	deno, err := os.ReadFile(filepath.Join(root, "deno.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(deno), "test:authoring") {
		t.Fatalf("deno.json must expose test:authoring")
	}
	if strings.Contains(string(deno), "\"rag") {
		t.Fatalf("deno.json must not expose retired RAG tasks")
	}
}
