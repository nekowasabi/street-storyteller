package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// sampleManuscript returns a minimal .md with YAML frontmatter.
func sampleManuscript(frontmatter string) string {
	return "---\n" + frontmatter + "---\n\n# Chapter 1\n\nContent here.\n"
}

func writeManuscript(t *testing.T, dir, name, content string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatalf("writeManuscript: %v", err)
	}
	return p
}

func bindingHandle(t *testing.T, args any, projectRoot string) (text string, isErr bool) {
	t.Helper()
	raw, err := json.Marshal(args)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	res, err := ManuscriptBindingTool{}.Handle(context.Background(), raw, ExecutionContext{ProjectRoot: projectRoot})
	if err != nil {
		t.Fatalf("Handle returned unexpected go error: %v", err)
	}
	return res.Content[0].Text, res.IsError
}

// TestManuscriptBinding_Definition checks tool metadata.
func TestManuscriptBinding_Definition(t *testing.T) {
	def := ManuscriptBindingTool{}.Definition()
	if def.Name != "manuscript_binding" {
		t.Errorf("Name = %q, want manuscript_binding", def.Name)
	}
	if def.Description == "" {
		t.Error("Description must not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("InputSchema must not be empty")
	}
}

// TestManuscriptBinding_Add adds IDs to an existing list.
func TestManuscriptBinding_Add(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md",
		sampleManuscript("title: Chapter 1\ncharacters:\n  - alice\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "add",
		"entityType": "characters",
		"ids":        []string{"bob", "carol"},
		"validate":   false,
	}, dir)

	if isErr {
		t.Fatalf("unexpected error: %s", text)
	}
	if !strings.Contains(text, "manuscript binding updated") {
		t.Errorf("unexpected message: %s", text)
	}

	got, _ := os.ReadFile(md)
	s := string(got)
	if !strings.Contains(s, "alice") {
		t.Error("alice should be preserved")
	}
	if !strings.Contains(s, "bob") {
		t.Error("bob should be added")
	}
	if !strings.Contains(s, "carol") {
		t.Error("carol should be added")
	}
}

// TestManuscriptBinding_Add_NoDuplicates ensures no duplicate IDs.
func TestManuscriptBinding_Add_NoDuplicates(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md",
		sampleManuscript("characters:\n  - alice\n"))

	_, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "add",
		"entityType": "characters",
		"ids":        []string{"alice", "bob"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatal("unexpected error")
	}

	got, _ := os.ReadFile(md)
	s := string(got)
	// alice must appear exactly once
	count := strings.Count(s, "alice")
	if count != 1 {
		t.Errorf("alice count = %d, want 1; file:\n%s", count, s)
	}
}

// TestManuscriptBinding_Remove removes IDs from the list.
func TestManuscriptBinding_Remove(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md",
		sampleManuscript("characters:\n  - alice\n  - bob\n  - carol\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "remove",
		"entityType": "characters",
		"ids":        []string{"bob"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatalf("unexpected error: %s", text)
	}

	got, _ := os.ReadFile(md)
	s := string(got)
	if strings.Contains(s, "bob") {
		t.Error("bob should be removed")
	}
	if !strings.Contains(s, "alice") {
		t.Error("alice should remain")
	}
	if !strings.Contains(s, "carol") {
		t.Error("carol should remain")
	}
}

// TestManuscriptBinding_Set replaces the list entirely.
func TestManuscriptBinding_Set(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md",
		sampleManuscript("characters:\n  - old_char\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "set",
		"entityType": "characters",
		"ids":        []string{"new_char"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatalf("unexpected error: %s", text)
	}

	got, _ := os.ReadFile(md)
	s := string(got)
	if strings.Contains(s, "old_char") {
		t.Error("old_char should be replaced")
	}
	if !strings.Contains(s, "new_char") {
		t.Error("new_char should be set")
	}
}

// TestManuscriptBinding_NoFrontmatter creates one when absent.
func TestManuscriptBinding_NoFrontmatter(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md", "")
	// overwrite with no frontmatter
	if err := os.WriteFile(md, []byte("# Chapter 1\n\nContent.\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "add",
		"entityType": "settings",
		"ids":        []string{"forest"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatal("should create frontmatter when absent")
	}

	got, _ := os.ReadFile(md)
	if !strings.Contains(string(got), "forest") {
		t.Error("forest should appear in new frontmatter")
	}
}

// TestManuscriptBinding_MissingManuscript returns IsError.
func TestManuscriptBinding_MissingManuscript(t *testing.T) {
	dir := t.TempDir()
	_, isErr := bindingHandle(t, map[string]any{
		"manuscript": filepath.Join(dir, "nonexistent.md"),
		"action":     "add",
		"entityType": "characters",
		"ids":        []string{"hero"},
		"validate":   false,
	}, dir)
	if !isErr {
		t.Error("missing file should return IsError")
	}
}

// TestManuscriptBinding_MissingRequiredArgs returns IsError.
func TestManuscriptBinding_MissingRequiredArgs(t *testing.T) {
	dir := t.TempDir()
	// no manuscript field
	_, isErr := bindingHandle(t, map[string]any{
		"action":     "add",
		"entityType": "characters",
		"ids":        []string{"hero"},
		"validate":   false,
	}, dir)
	if !isErr {
		t.Error("missing manuscript should return IsError")
	}
}
