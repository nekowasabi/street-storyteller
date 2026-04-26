package lint

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

// fakeWorker allows controlling textlint output in tests.
type fakeWorker struct {
	msgs []textlint.Message
	err  error
}

func (f *fakeWorker) Lint(_ context.Context, _ string, _ []byte) ([]textlint.Message, error) {
	return f.msgs, f.err
}

func newTestCommand(w textlint.Worker, r *process.FakeRunner) *lintCommand {
	return &lintCommand{
		worker:    w,
		avRunner:  r,
		available: true, // pre-set available so tests skip the availability check
	}
}

// makeProject creates a temp dir with one .md file and returns the dir path.
func makeProject(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "chapter01.md"), []byte("# test\nsome content"), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestLint_NoIssues(t *testing.T) {
	dir := makeProject(t)
	w := &fakeWorker{msgs: []textlint.Message{}}
	cmd := newTestCommand(w, process.NewFakeRunner())
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
	if !strings.Contains(out.String(), "0 warnings") && !strings.Contains(out.String(), "0 errors") {
		t.Errorf("expected summary in output, got %q", out.String())
	}
}

func TestLint_WithWarnings_ReturnsNonZero(t *testing.T) {
	dir := makeProject(t)
	w := &fakeWorker{msgs: []textlint.Message{
		{RuleID: "rule1", Severity: textlint.SeverityWarning, Message: "bad style", Line: 2, Column: 1},
	}}
	cmd := newTestCommand(w, process.NewFakeRunner())
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
}

func TestLint_JSONOutput(t *testing.T) {
	dir := makeProject(t)
	w := &fakeWorker{msgs: []textlint.Message{
		{RuleID: "rule1", Severity: textlint.SeverityError, Message: "error msg", Line: 1, Column: 1},
	}}
	cmd := newTestCommand(w, process.NewFakeRunner())
	var out bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       []string{"--path", dir},
		Presenter:  cli.NewJSONPresenter(&out),
		Deps:       cli.Deps{Stdout: &out},
		GlobalOpts: cli.GlobalOptions{JSON: true},
	})
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
	var result lintJSONResult
	if err := json.Unmarshal(out.Bytes(), &result); err != nil {
		t.Fatalf("invalid JSON: %v\noutput: %s", err, out.String())
	}
	if result.Errors != 1 {
		t.Errorf("errors = %d, want 1", result.Errors)
	}
}

func TestLint_SeverityFilter_ErrorOnly(t *testing.T) {
	dir := makeProject(t)
	w := &fakeWorker{msgs: []textlint.Message{
		{RuleID: "r1", Severity: textlint.SeverityWarning, Message: "warn", Line: 1},
		{RuleID: "r2", Severity: textlint.SeverityError, Message: "err", Line: 2},
	}}
	cmd := newTestCommand(w, process.NewFakeRunner())
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir, "--severity", "error"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	// Should exit 1 due to error, but only count errors in output.
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
	// Filtered output should not contain the warning message detail line.
	// The summary line may still say "0 warnings"; check the detail line.
	if strings.Contains(out.String(), "[warning]") {
		t.Errorf("output should not contain [warning] detail when severity=error: %q", out.String())
	}
}

func TestLint_NotAvailable_GracefulDegrade(t *testing.T) {
	dir := makeProject(t)
	r := process.NewFakeRunner()
	// IsAvailable will call version check; exit 127 = not found.
	r.Plan(process.FakeResponse{ExitCode: 127})
	cmd := &lintCommand{
		worker:    &fakeWorker{},
		avRunner:  r,
		available: false, // explicitly not available
	}
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Errorf("exit = %d, want 0 (graceful degrade)", code)
	}
	combined := out.String() + errBuf.String()
	if !strings.Contains(combined, "not available") && !strings.Contains(combined, "skipping") {
		t.Errorf("expected 'not available' or 'skipping' in output: %q", combined)
	}
}

func TestLint_Fix_Stub(t *testing.T) {
	dir := makeProject(t)
	w := &fakeWorker{msgs: []textlint.Message{}}
	cmd := newTestCommand(w, process.NewFakeRunner())
	var out, errBuf bytes.Buffer
	code := cmd.Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", dir, "--fix"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	// --fix is a stub; should not crash, exit 0 on clean.
	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
}
