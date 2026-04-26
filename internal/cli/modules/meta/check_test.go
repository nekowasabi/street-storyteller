package meta

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestMetaCheck_NoFiles(t *testing.T) {
	dir := t.TempDir()
	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "0") {
		t.Errorf("expected count=0 in output, got %q", out.String())
	}
}

func TestMetaCheck_ValidFile(t *testing.T) {
	dir := filepath.Join("testdata", "valid")
	if _, err := os.Stat(dir); err != nil {
		t.Fatalf("missing testdata: %v", err)
	}
	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "1") {
		t.Errorf("expected count=1 in output: %q", out.String())
	}
}

func TestMetaCheck_InvalidFile_Exit1(t *testing.T) {
	dir := filepath.Join("testdata", "invalid")
	cmd := New()
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 1 {
		t.Errorf("exit = %d, want 1; stderr=%q", code, errBuf.String())
	}
	if errBuf.Len() == 0 {
		t.Error("expected non-empty stderr")
	}
}

func TestMetaCheck_JSONOutput(t *testing.T) {
	dir := filepath.Join("testdata", "valid")
	cmd := New()
	var out bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       []string{"--path", dir},
		Presenter:  cli.NewJSONPresenter(&out),
		Deps:       cli.Deps{Stdout: &out},
		GlobalOpts: cli.GlobalOptions{JSON: true},
	})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	if !strings.Contains(out.String(), `"ok":true`) {
		t.Errorf("missing ok:true: %q", out.String())
	}
	if !strings.Contains(out.String(), `"files_checked":1`) {
		t.Errorf("missing files_checked:1: %q", out.String())
	}
}
