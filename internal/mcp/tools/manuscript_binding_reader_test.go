package tools

import (
	"os"
	"strings"
	"testing"
)

func TestManuscriptBinding_ReaderShows_AddKeepsOrder(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch04.md",
		sampleManuscript("storyteller:\n  reader_shows:\n    - \"loc:misled\"\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "add",
		"entityType": "reader_shows",
		"ids":        []string{"loc:corrected"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatalf("unexpected error: %s", text)
	}
	got, _ := os.ReadFile(md)
	s := string(got)
	if strings.Index(s, "loc:misled") > strings.Index(s, "loc:corrected") {
		t.Errorf("order must be misled then corrected:\n%s", s)
	}
}

func TestManuscriptBinding_ReaderShows_RejectsUnknownStance(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch01.md", sampleManuscript("storyteller:\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "add",
		"entityType": "reader_shows",
		"ids":        []string{"loc:believed"},
		"validate":   false,
	}, dir)
	if !isErr || !strings.Contains(text, "unknown stance") {
		t.Fatalf("want unknown stance error, got isErr=%v text=%s", isErr, text)
	}
}

func TestManuscriptBinding_ReaderRequires_AllowsBareID(t *testing.T) {
	dir := t.TempDir()
	md := writeManuscript(t, dir, "ch03.md", sampleManuscript("storyteller:\n"))

	text, isErr := bindingHandle(t, map[string]any{
		"manuscript": md,
		"action":     "set",
		"entityType": "reader_requires",
		"ids":        []string{"loc:shown", "hist"},
		"validate":   false,
	}, dir)
	if isErr {
		t.Fatalf("unexpected error: %s", text)
	}
	got, _ := os.ReadFile(md)
	if !strings.Contains(string(got), "\"hist\"") {
		t.Errorf("bare id must be written:\n%s", got)
	}
}
