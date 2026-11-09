package reader

import (
	"bytes"
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func rainkey(name string) string {
	return filepath.Join("..", "..", "..", "service", "testdata", "clarity_rainkey", name)
}

func run(args ...string) (int, string) {
	var out, errBuf bytes.Buffer
	code := New().Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       args,
		Presenter:  cli.NewTextPresenter(&out, &errBuf),
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{Path: rainkey("manuscripts")},
	})
	return code, out.String() + errBuf.String()
}

func TestReaderCheck_ExitIsZeroWithoutMain(t *testing.T) {
	code, out := run("--observations", rainkey("observations_break_202.tsv"))
	if code != 0 || !strings.Contains(out, "RDR-202") {
		t.Errorf("exit = %d, out = %q", code, out)
	}
}

func TestReaderCheck_MainPropositionFailsExit(t *testing.T) {
	code, out := run("--observations", rainkey("observations_break_202.tsv"), "--main", rainkey("main.txt"))
	if code != 1 {
		t.Errorf("exit = %d, want 1; out = %q", code, out)
	}
}

func TestReaderCheck_PassPrintsBoxesAndSummary(t *testing.T) {
	code, out := run("--observations=" + rainkey("observations_pass.tsv"))
	if code != 0 || !strings.Contains(out, "早すぎ: 1") || !strings.Contains(out, "4 chapters, 9 observations") {
		t.Errorf("exit = %d, out = %q", code, out)
	}
}

func TestReaderCheck_ObservationsRequired(t *testing.T) {
	if code, _ := run(); code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
}
