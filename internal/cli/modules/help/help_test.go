package help

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

type fakeCmd struct{ name string }

func (f *fakeCmd) Name() string                { return f.name }
func (f *fakeCmd) Description() string         { return "" }
func (f *fakeCmd) Handle(_ cli.CommandContext) int { return 0 }

func TestHelpCommand_ListsRegisteredCommands(t *testing.T) {
	r := cli.NewRegistry()
	_ = r.Register("version", &fakeCmd{name: "version"})
	_ = r.Register("meta check", &fakeCmd{name: "meta check"})

	cmd := New(r)
	if cmd.Name() != "help" {
		t.Errorf("Name = %q", cmd.Name())
	}

	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	got := out.String()
	if !strings.Contains(got, "version") || !strings.Contains(got, "meta check") {
		t.Errorf("output missing entries: %q", got)
	}
	idxMeta := strings.Index(got, "meta check")
	idxVer := strings.Index(got, "version")
	if !(idxMeta < idxVer) {
		t.Errorf("expected sorted order (meta check before version): %q", got)
	}
}

func TestHelpCommand_EmptyRegistry(t *testing.T) {
	r := cli.NewRegistry()
	cmd := New(r)
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
}
