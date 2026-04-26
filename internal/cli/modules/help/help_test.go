package help

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// fakeCmd implements cli.Command (no Usage). Used to verify the
// Description-only fallback path in the help renderer.
type fakeCmd struct {
	name string
	desc string
}

func (f *fakeCmd) Name() string                    { return f.name }
func (f *fakeCmd) Description() string             { return f.desc }
func (f *fakeCmd) Handle(_ cli.CommandContext) int { return 0 }

// fakeCmdWithUsage implements cli.CommandWithUsage. Used to verify the
// Usage-rendering branch (Optional interface upgrade via type assertion).
type fakeCmdWithUsage struct {
	fakeCmd
	usage string
}

func (f *fakeCmdWithUsage) Usage() string { return f.usage }

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

// TestHelp_RendersCommandDescriptions verifies the dead-contract fix:
// help output must include each command's Description() text alongside the path.
func TestHelp_RendersCommandDescriptions(t *testing.T) {
	r := cli.NewRegistry()
	_ = r.Register("version", &fakeCmd{name: "version", desc: "show version"})
	_ = r.Register("meta check", &fakeCmd{name: "meta check", desc: "run metadata check"})

	cmd := New(r)
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Fatalf("exit = %d", code)
	}
	got := out.String()
	if !strings.Contains(got, "show version") {
		t.Errorf("missing version description in output:\n%s", got)
	}
	if !strings.Contains(got, "run metadata check") {
		t.Errorf("missing meta-check description in output:\n%s", got)
	}
}

// TestHelp_RendersUsageWhenAvailable verifies that commands implementing
// CommandWithUsage have their Usage() string rendered in addition to (or
// instead of) Description.
func TestHelp_RendersUsageWhenAvailable(t *testing.T) {
	r := cli.NewRegistry()
	_ = r.Register("rich", &fakeCmdWithUsage{
		fakeCmd: fakeCmd{name: "rich", desc: "rich command"},
		usage:   "rich --flag <arg>",
	})

	cmd := New(r)
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Fatalf("exit = %d", code)
	}
	got := out.String()
	if !strings.Contains(got, "rich --flag <arg>") {
		t.Errorf("missing usage string in output:\n%s", got)
	}
}

// TestHelp_FallsBackToDescriptionWhenNoUsage verifies the type-assertion
// fallback path: a plain Command (no Usage) must still produce output that
// contains its Description without crashing.
func TestHelp_FallsBackToDescriptionWhenNoUsage(t *testing.T) {
	r := cli.NewRegistry()
	_ = r.Register("plain", &fakeCmd{name: "plain", desc: "plain description"})

	cmd := New(r)
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Fatalf("exit = %d", code)
	}
	got := out.String()
	if !strings.Contains(got, "plain description") {
		t.Errorf("missing fallback description in output:\n%s", got)
	}
	// Must not contain "<nil>" or panic markers.
	if strings.Contains(got, "<nil>") {
		t.Errorf("unexpected <nil> in output:\n%s", got)
	}
}
