package lsp

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestLspValidate_NoFile_Exit1(t *testing.T) {
	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      nil,
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
	if errBuf.Len() == 0 {
		t.Error("expected stderr message")
	}
}

func TestLspValidate_FileNotFound_Exit2(t *testing.T) {
	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--file", "/nonexistent/path/file.md"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 2 {
		t.Errorf("exit = %d, want 2 (file not found)", code)
	}
	if errBuf.Len() == 0 {
		t.Error("expected stderr message for missing file")
	}
}

func TestLspValidate_DetectionCount(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "x.md")
	if err := os.WriteFile(mdPath, []byte("hello world"), 0644); err != nil {
		t.Fatal(err)
	}

	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--file", mdPath},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
	// Should contain filename and entity count
	outStr := out.String()
	if !strings.Contains(outStr, "x.md") {
		t.Errorf("expected filename in output, got %q", outStr)
	}
	if !strings.Contains(outStr, "0 entities") {
		t.Errorf("expected '0 entities' in %q", outStr)
	}
}

func TestLspValidate_JSONOutput(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "sample.md")
	if err := os.WriteFile(mdPath, []byte("# Chapter 1\n\nHello world."), 0644); err != nil {
		t.Fatal(err)
	}

	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       []string{"--file", mdPath},
		Presenter:  cli.NewTextPresenter(&out, &errBuf),
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{JSON: true},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
	outStr := out.String()

	// Should be valid JSON array
	var result []map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(outStr)), &result); err != nil {
		t.Errorf("JSON parse error: %v, output=%q", err, outStr)
	}
}

func TestLspValidate_SeverityFilter_HighThreshold(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "story.md")
	if err := os.WriteFile(mdPath, []byte("hello world"), 0644); err != nil {
		t.Fatal(err)
	}

	cmd := New()
	var out, errBuf bytes.Buffer
	// --severity error maps to confidence >= 0.9 threshold
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--file", mdPath, "--severity", "error"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
}

func TestLspValidate_PositionalFileArg(t *testing.T) {
	dir := t.TempDir()
	mdPath := filepath.Join(dir, "story.md")
	if err := os.WriteFile(mdPath, []byte("hello world"), 0644); err != nil {
		t.Fatal(err)
	}

	cmd := New()
	var out, errBuf bytes.Buffer
	// Positional argument (no --file flag)
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{mdPath},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
}

func writeHeroProject(t *testing.T, root string) string {
	t.Helper()
	files := map[string]string{
		".storyteller.json": `{"version":"1.0.0"}`,
		"src/characters/hero.ts": `export const hero = {
  "id": "hero",
  "name": "勇者",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "主人公"
};`,
		"chapter.md": "勇者は走った\n",
	}
	for rel, body := range files {
		p := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return filepath.Join(root, "chapter.md")
}

func TestLspValidate_CountsCatalogDetections(t *testing.T) {
	root := t.TempDir()
	md := writeHeroProject(t, root)
	for name, cctxFor := range map[string]func() cli.GlobalOptions{
		"--path":            func() cli.GlobalOptions { return cli.GlobalOptions{Path: root} },
		"working directory": func() cli.GlobalOptions { t.Chdir(root); return cli.GlobalOptions{} },
	} {
		var out, errBuf bytes.Buffer
		code := New().Handle(cli.CommandContext{
			Ctx:        context.Background(),
			Args:       []string{"--file", md},
			Presenter:  cli.NewTextPresenter(&out, &errBuf),
			Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
			GlobalOpts: cctxFor(),
		})
		if code != 0 {
			t.Fatalf("%s: exit = %d, stderr=%q", name, code, errBuf.String())
		}
		if want := md + ": 1 entities detected"; !strings.Contains(out.String(), want) {
			t.Errorf("%s: got %q, want %q", name, out.String(), want)
		}
	}
}
