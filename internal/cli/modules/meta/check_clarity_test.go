package meta

import (
	"bytes"
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func rainkeyManuscripts(t *testing.T, variant string) string {
	t.Helper()
	abs, err := filepath.Abs(filepath.Join("..", "..", "..", "service", "testdata", variant, "manuscripts"))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	return abs
}

func TestMetaCheck_ClarityPass(t *testing.T) {
	var out, errBuf bytes.Buffer
	code := New().Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", rainkeyManuscripts(t, "clarity_rainkey")},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 0 {
		t.Fatalf("exit = %d, stderr=%q", code, errBuf.String())
	}
}

func TestMetaCheck_ClarityBreak1_Exit1WithLines(t *testing.T) {
	var out, errBuf bytes.Buffer
	code := New().Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--path", rainkeyManuscripts(t, "clarity_rainkey_break1")},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	if code != 1 {
		t.Fatalf("exit = %d, want 1; stderr=%q", code, errBuf.String())
	}
	s := errBuf.String()
	if !strings.Contains(s, "chapter03.md:") || !strings.Contains(s, "RDR-102") || !strings.Contains(s, "命題 loc の前提 shown") {
		t.Errorf("stderr = %q", s)
	}
}

func TestMetaCheck_ClarityBreak1_JSON(t *testing.T) {
	var out bytes.Buffer
	code := New().Handle(cli.CommandContext{
		Ctx:        context.Background(),
		Args:       []string{"--path", rainkeyManuscripts(t, "clarity_rainkey_break1")},
		Presenter:  cli.NewJSONPresenter(&out),
		Deps:       cli.Deps{Stdout: &out},
		GlobalOpts: cli.GlobalOptions{JSON: true},
	})
	if code != 1 {
		t.Fatalf("exit = %d, want 1", code)
	}
	s := out.String()
	if !strings.Contains(s, `"ok":false`) || !strings.Contains(s, `"code":"RDR-102"`) || !strings.Contains(s, `"line":`) {
		t.Errorf("json = %q", s)
	}
}
