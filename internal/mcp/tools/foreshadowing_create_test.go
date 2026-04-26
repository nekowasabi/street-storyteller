package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestForeshadowingCreateTool_Definition(t *testing.T) {
	def := ForeshadowingCreateTool{}.Definition()
	if def.Name != "foreshadowing_create" {
		t.Errorf("name = %q, want %q", def.Name, "foreshadowing_create")
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

// newForeshadowingProject creates a minimal project dir with .storyteller.json
// and an empty src/foreshadowings directory (default path).
func newForeshadowingProject(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	if err := os.MkdirAll(filepath.Join(root, "src", "foreshadowings"), 0o755); err != nil {
		t.Fatal(err)
	}
	return root
}

func TestForeshadowingCreateTool_Handle_MissingRequired(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	tests := []struct {
		name string
		args string
	}{
		{"no name", `{"type":"chekhov","summary":"s","planting_chapter":"ch01","planting_description":"d"}`},
		{"no type", `{"name":"古びた剣","summary":"s","planting_chapter":"ch01","planting_description":"d"}`},
		{"no summary", `{"name":"古びた剣","type":"chekhov","planting_chapter":"ch01","planting_description":"d"}`},
		{"no planting_chapter", `{"name":"古びた剣","type":"chekhov","summary":"s","planting_description":"d"}`},
		{"no planting_description", `{"name":"古びた剣","type":"chekhov","summary":"s","planting_chapter":"ch01"}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res, err := ForeshadowingCreateTool{}.Handle(context.Background(), json.RawMessage(tc.args), ec)
			if err != nil {
				t.Fatalf("Handle returned error: %v", err)
			}
			if !res.IsError {
				t.Errorf("expected IsError=true for missing required field (%s)", tc.name)
			}
		})
	}
}

func TestForeshadowingCreateTool_Handle_InvalidType(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	args := json.RawMessage(`{"name":"古びた剣","type":"invalid_type","summary":"s","planting_chapter":"ch01","planting_description":"d"}`)
	res, err := ForeshadowingCreateTool{}.Handle(context.Background(), args, ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError=true for invalid type")
	}
}

func TestForeshadowingCreateTool_Handle_Success(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	args := json.RawMessage(`{"name":"古びた剣","type":"chekhov","summary":"床板の下に隠された剣","planting_chapter":"chapter_01","planting_description":"床板の下から発見"}`)
	res, err := ForeshadowingCreateTool{}.Handle(context.Background(), args, ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	if len(res.Content) == 0 {
		t.Fatal("no content returned")
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "foreshadowing created:") {
		t.Errorf("expected 'foreshadowing created:' in output, got %q", text)
	}
}

func TestForeshadowingCreateTool_Handle_ExplicitID(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	args := json.RawMessage(`{"id":"my_sword","name":"剣","type":"chekhov","summary":"s","planting_chapter":"ch01","planting_description":"d"}`)
	res, err := ForeshadowingCreateTool{}.Handle(context.Background(), args, ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	if !strings.Contains(res.Content[0].Text, "my_sword") {
		t.Errorf("expected id 'my_sword' in output, got %q", res.Content[0].Text)
	}
}

func TestForeshadowingCreateTool_Handle_AllValidTypes(t *testing.T) {
	validTypes := []string{"hint", "prophecy", "mystery", "symbol", "chekhov", "red_herring"}
	for _, ft := range validTypes {
		t.Run(ft, func(t *testing.T) {
			root := newForeshadowingProject(t)
			ec := ExecutionContext{ProjectRoot: root}

			args := json.RawMessage(`{"name":"test","type":"` + ft + `","summary":"s","planting_chapter":"ch01","planting_description":"d"}`)
			res, err := ForeshadowingCreateTool{}.Handle(context.Background(), args, ec)
			if err != nil {
				t.Fatalf("Handle returned error: %v", err)
			}
			if res.IsError {
				t.Errorf("unexpected IsError for type %q: %s", ft, res.Content[0].Text)
			}
		})
	}
}

func TestForeshadowingCreateTool_Handle_WithOptionals(t *testing.T) {
	root := newForeshadowingProject(t)
	ec := ExecutionContext{ProjectRoot: root}

	args := json.RawMessage(`{
		"name":"予言",
		"type":"prophecy",
		"summary":"古い予言",
		"planting_chapter":"chapter_01",
		"planting_description":"神殿で告げられた",
		"importance":"major",
		"planned_resolution_chapter":"chapter_10"
	}`)
	res, err := ForeshadowingCreateTool{}.Handle(context.Background(), args, ec)
	if err != nil {
		t.Fatalf("Handle returned error: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	if !strings.Contains(res.Content[0].Text, "foreshadowing created:") {
		t.Errorf("expected 'foreshadowing created:' in output, got %q", res.Content[0].Text)
	}
}
