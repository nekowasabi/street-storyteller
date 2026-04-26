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
