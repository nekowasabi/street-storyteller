package view

import (
	"bytes"
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestViewCharacter_FromTestdata(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("testdata", "minimal_project"))
	if err != nil {
		t.Fatal(err)
	}

	cmd := New()
	if cmd.Name() != "view character" {
		t.Errorf("Name = %q", cmd.Name())
	}

	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--id", "hero", "--path", root},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "Hero") {
		t.Errorf("missing name 'Hero': %q", out.String())
	}
	if !strings.Contains(out.String(), "protagonist") {
		t.Errorf("missing role 'protagonist': %q", out.String())
	}
}

func TestViewCharacter_MissingID_Exit1(t *testing.T) {
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
}
