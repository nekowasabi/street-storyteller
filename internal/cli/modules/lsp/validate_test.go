package lsp

import (
	"bytes"
	"context"
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
	if !strings.Contains(out.String(), "0") {
		t.Errorf("expected '0 detections' in %q", out.String())
	}
}
