package cli

import (
	"bytes"
	"context"
	"strings"
	"testing"
)

type stubHelp struct {
	called bool
}

func (s *stubHelp) Name() string        { return "help" }
func (s *stubHelp) Description() string { return "show help" }
func (s *stubHelp) Handle(cctx CommandContext) int {
	s.called = true
	cctx.Presenter.ShowInfo("help-stub")
	return 0
}

type stubVer struct {
	gotArgs []string
}

func (s *stubVer) Name() string        { return "version" }
func (s *stubVer) Description() string { return "" }
func (s *stubVer) Handle(cctx CommandContext) int {
	s.gotArgs = cctx.Args
	cctx.Presenter.ShowInfo("v0")
	return 0
}

func TestRun_NoArgs_PrintsHelp_Exit0(t *testing.T) {
	r := NewRegistry()
	help := &stubHelp{}
	if err := r.Register("help", help); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	deps := Deps{Stdout: &out, Stderr: &errBuf}
	code := RunWithRegistry(context.Background(), nil, deps, r)
	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
	if !help.called {
		t.Error("help command was not invoked")
	}
}

func TestRun_UnknownCommand_PrintsErrorToStderr_Exit2(t *testing.T) {
	r := NewRegistry()
	var out, errBuf bytes.Buffer
	deps := Deps{Stdout: &out, Stderr: &errBuf}
	code := RunWithRegistry(context.Background(), []string{"nonexistent"}, deps, r)
	if code != 2 {
		t.Errorf("exit = %d, want 2", code)
	}
	if !strings.Contains(errBuf.String(), "unknown command") {
		t.Errorf("stderr should mention 'unknown command': %q", errBuf.String())
	}
}

func TestRunWithRegistry_DispatchesToCommand(t *testing.T) {
	r := NewRegistry()
	v := &stubVer{}
	_ = r.Register("version", v)
	_ = r.Register("help", &stubHelp{})

	var out, errBuf bytes.Buffer
	deps := Deps{Stdout: &out, Stderr: &errBuf}
	code := RunWithRegistry(context.Background(), []string{"--json", "version", "extra"}, deps, r)
	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
	if len(v.gotArgs) != 1 || v.gotArgs[0] != "extra" {
		t.Errorf("version got args = %v, want [extra]", v.gotArgs)
	}
}
