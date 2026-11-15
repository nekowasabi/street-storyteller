package review_test

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/cli/modules"
	reviewmod "github.com/takets/street-storyteller/internal/cli/modules/review"
	svc "github.com/takets/street-storyteller/internal/service/review"
)

// R10: the CLI surface. Everything runs through the registry the binary uses.

func rainkeyManuscripts(t *testing.T) string {
	t.Helper()
	return filepath.Join("..", "..", "..", "service", "review", "testdata", "rainkey", "manuscripts")
}

func runCLI(t *testing.T, args ...string) (int, string, string) {
	t.Helper()
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	code := cli.RunWithRegistry(context.Background(), args, cli.Deps{Stdout: &out, Stderr: &errBuf, Stdin: strings.NewReader("")}, r)
	return code, out.String(), errBuf.String()
}

func singleJSON(t *testing.T, out string) map[string]any {
	t.Helper()
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) != 1 {
		t.Fatalf("stdout has %d lines, want exactly one JSON object:\n%s", len(lines), out)
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &m); err != nil {
		t.Fatalf("stdout is not JSON: %v\n%s", err, out)
	}
	return m
}

func TestReviewCLI_CommandsAreRegisteredAndListedInHelp(t *testing.T) {
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"review clarity", "review typo", "review interest", "review consult", "review turn", "review resolve"} {
		if _, _, ok := r.Resolve(strings.Split(path, " ")); !ok {
			t.Errorf("%q is not registered", path)
		}
	}
	_, out, _ := runCLI(t, "help")
	for _, want := range []string{"review clarity", "review turn", "review resolve"} {
		if !strings.Contains(out, want) {
			t.Errorf("help lacks %q", want)
		}
	}
}

func TestReviewCLI_UnknownFlagIsExit2(t *testing.T) {
	for _, args := range [][]string{
		{"review", "clarity", "--path", rainkeyManuscripts(t), "--observations", "x.tsv"},
		{"review", "typo", "--path", rainkeyManuscripts(t), "--fix"},
		{"review", "clarity", "--path", rainkeyManuscripts(t), "--skip-probe"},
		{"review", "turn", "--run", "r-00000000", "--agent", "P1", "--step", "1", "--notes", "-", "--force"},
		{"review", "resolve", "P2:loc:reask", "--accept", "--why", "x", "--yes"},
	} {
		if code, out, errOut := runCLI(t, args...); code != 2 {
			t.Errorf("%v: exit %d, want 2\n%s%s", args, code, out, errOut)
		}
	}
}

func TestReviewCLI_ExtraArgumentsAreExit2(t *testing.T) {
	for _, args := range [][]string{
		{"review", "clarity", "--path", rainkeyManuscripts(t), "extra"},
		{"review", "typo", "--path", rainkeyManuscripts(t), "extra"},
		{"review", "consult", "--path", rainkeyManuscripts(t), "one", "two"},
		{"review", "resolve", "--accept", "--why", "x"},
		{"review", "resolve", "a:b:ask", "c:d:ask", "--accept", "--why", "x"},
		{"review", "spellcheck"},
		{"review"},
	} {
		if code, out, errOut := runCLI(t, args...); code != 2 {
			t.Errorf("%v: exit %d, want 2\n%s%s", args, code, out, errOut)
		}
	}
}

func TestReviewCLI_JSONIsOneObjectOnEveryExitCode(t *testing.T) {
	// exit 2: usage
	code, out, _ := runCLI(t, "--json", "review", "clarity", "--path", rainkeyManuscripts(t), "--bogus")
	m := singleJSON(t, out)
	if code != 2 || m["verdict"] != "usage" {
		t.Errorf("usage: exit %d verdict %v", code, m["verdict"])
	}
	// exit 4: typo without textlint, through injected deps
	var buf bytes.Buffer
	cmd := reviewmod.NewWithDeps("typo", svc.Deps{TextlintAvailable: func(context.Context) (bool, string) { return false, "missing" }})
	code = cmd.Handle(cli.CommandContext{Ctx: context.Background(), Args: nil, Presenter: cli.NewJSONPresenter(&buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{JSON: true, Path: rainkeyManuscripts(t)}})
	m = singleJSON(t, buf.String())
	if code != 4 || m["verdict"] != "error" || m["kind"] != "typo" {
		t.Errorf("typo without textlint: exit %d %v", code, m)
	}
	// exit 3: clarity without --team on an unread body, through injected fakes
	buf.Reset()
	root := t.TempDir()
	copyTree(t, filepath.Dir(rainkeyManuscripts(t)), root)
	deps := svc.Deps{Decider: constantDecider(0.9), WorkRoot: t.TempDir(), MapRoot: t.TempDir()}
	cmd = reviewmod.NewWithDeps("clarity", deps)
	code = cmd.Handle(cli.CommandContext{Ctx: context.Background(), Args: nil, Presenter: cli.NewJSONPresenter(&buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{JSON: true, Path: filepath.Join(root, "manuscripts")}})
	m = singleJSON(t, buf.String())
	if code != 3 || m["verdict"] != "author" || m["criteria"] == "" {
		t.Errorf("unread clarity: exit %d %v", code, m)
	}
}

func TestReviewCLI_TextEndsWithResultLine(t *testing.T) {
	var buf bytes.Buffer
	cmd := reviewmod.NewWithDeps("typo", svc.Deps{TextlintAvailable: func(context.Context) (bool, string) { return false, "missing" }})
	code := cmd.Handle(cli.CommandContext{Ctx: context.Background(), Presenter: cli.NewTextPresenter(&buf, &buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{Path: rainkeyManuscripts(t)}})
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	last := lines[len(lines)-1]
	if code != 4 || !strings.HasPrefix(last, "RESULT ERROR exit=4") {
		t.Errorf("exit %d last line %q", code, last)
	}
	if !strings.Contains(buf.String(), "REV-404") {
		t.Errorf("output lacks REV-404:\n%s", buf.String())
	}
}

func TestReviewCLI_TurnReadsStdinAndPrintsStepAndFile(t *testing.T) {
	root := t.TempDir()
	copyTree(t, filepath.Dir(rainkeyManuscripts(t)), root)
	launcher := &recordingLauncher{}
	deps := svc.Deps{Decider: constantDecider(0.9), Launcher: launcher, WorkRoot: t.TempDir(), MapRoot: t.TempDir()}
	var buf bytes.Buffer
	clarity := reviewmod.NewWithDeps("clarity", deps)
	code := clarity.Handle(cli.CommandContext{Ctx: context.Background(), Args: []string{"--team", "--wait", "0.001"}, Presenter: cli.NewJSONPresenter(&buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{JSON: true, Path: filepath.Join(root, "manuscripts")}})
	m := singleJSON(t, buf.String())
	if code != 5 || m["verdict"] != "reading" {
		t.Fatalf("clarity --team: exit %d %v", code, m)
	}
	run := m["run"].(string)
	if len(launcher.ids) != 3 {
		t.Fatalf("launches = %v", launcher.ids)
	}

	turn := reviewmod.NewWithDeps("turn", deps)
	var out, errOut bytes.Buffer
	code = turn.Handle(cli.CommandContext{Ctx: context.Background(), Args: []string{"--run", run, "--agent", "P1", "--step", "1", "--notes", "-"}, Presenter: cli.NewTextPresenter(&out, &errOut), Deps: cli.Deps{Stdout: &out, Stderr: &errOut, Stdin: strings.NewReader("旅人が宿に着いた (1:1)\n")}})
	if code != 0 || !strings.HasPrefix(out.String(), "STEP 2/7\nask-01.md\n") {
		t.Errorf("turn: exit %d out %q err %q", code, out.String(), errOut.String())
	}
	out.Reset()
	code = turn.Handle(cli.CommandContext{Ctx: context.Background(), Args: []string{"--run", run, "--agent", "P1", "--step", "3", "--notes", "-"}, Presenter: cli.NewTextPresenter(&out, &errOut), Deps: cli.Deps{Stdout: &out, Stderr: &errOut, Stdin: strings.NewReader("x\n")}})
	if code != 1 {
		t.Errorf("skip ahead through CLI: exit %d, want 1 (%s)", code, out.String())
	}
	out.Reset()
	code = turn.Handle(cli.CommandContext{Ctx: context.Background(), Args: []string{"--run", run, "--agent", "P1", "--step", "2", "--answers", "-"}, Presenter: cli.NewTextPresenter(&out, &errOut), Deps: cli.Deps{Stdout: &out, Stderr: &errOut, Stdin: strings.NewReader("door. 裏口は夜通し開いている (1:9)\n")}})
	if code != 0 || !strings.HasPrefix(out.String(), "STEP 3/7\nchapter02.md\n") {
		t.Errorf("turn answers: exit %d out %q", code, out.String())
	}
	// turn needs --run, --agent, --step and exactly one of --notes - / --answers -
	for _, args := range [][]string{
		{"--agent", "P1", "--step", "1", "--notes", "-"},
		{"--run", run, "--step", "1", "--notes", "-"},
		{"--run", run, "--agent", "P1", "--notes", "-"},
		{"--run", run, "--agent", "P1", "--step", "1"},
		{"--run", run, "--agent", "P1", "--step", "1", "--notes", "-", "--answers", "-"},
		{"--run", run, "--agent", "P1", "--step", "x", "--notes", "-"},
	} {
		out.Reset()
		if code := turn.Handle(cli.CommandContext{Ctx: context.Background(), Args: args, Presenter: cli.NewTextPresenter(&out, &errOut), Deps: cli.Deps{Stdout: &out, Stderr: &errOut, Stdin: strings.NewReader("x\n")}}); code != 2 {
			t.Errorf("%v: exit %d, want 2", args, code)
		}
	}
}

func TestReviewCLI_ResolveParsesCellAndFlags(t *testing.T) {
	root := t.TempDir()
	copyTree(t, filepath.Dir(rainkeyManuscripts(t)), root)
	deps := svc.Deps{Decider: constantDecider(0.9), WorkRoot: t.TempDir(), MapRoot: t.TempDir()}
	var buf bytes.Buffer
	resolve := reviewmod.NewWithDeps("resolve", deps)
	code := resolve.Handle(cli.CommandContext{Ctx: context.Background(), Args: []string{"P2:loc:reask", "--accept", "--why", "内容は合っている"}, Presenter: cli.NewJSONPresenter(&buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{JSON: true, Path: filepath.Join(root, "manuscripts")}})
	m := singleJSON(t, buf.String())
	if code != 2 || m["verdict"] != "usage" {
		t.Errorf("resolve before any record: exit %d %v", code, m)
	}
	if _, err := os.Stat(filepath.Join(root, "src", "reviews", "resolved.tsv")); err == nil {
		t.Error("resolved.tsv written although the cell is not in any record")
	}
	for _, args := range [][]string{
		{"P2:loc", "--accept", "--why", "x"},
		{"P2:loc:reask", "--why", "x"},
		{"P2:loc:reask", "--accept", "--reject", "--why", "x"},
		{"P2:loc:reask", "--accept"},
	} {
		buf.Reset()
		if code := resolve.Handle(cli.CommandContext{Ctx: context.Background(), Args: args, Presenter: cli.NewJSONPresenter(&buf), Deps: cli.Deps{Stdout: &buf, Stderr: &buf}, GlobalOpts: cli.GlobalOptions{JSON: true, Path: filepath.Join(root, "manuscripts")}}); code != 2 {
			t.Errorf("%v: exit %d, want 2", args, code)
		}
	}
}

// --- fakes ------------------------------------------------------------------

type constantDecider float64

func (c constantDecider) Decide(context.Context, string, svc.Query) (float64, error) { return float64(c), nil }

type recordingLauncher struct{ ids []string }

func (l *recordingLauncher) Launch(_ context.Context, id, _ string, _ svc.AgentLaunch) (svc.LaunchHandle, error) {
	l.ids = append(l.ids, id)
	return svc.LaunchHandle{ID: id, RunID: "x"}, nil
}
func (l *recordingLauncher) Close(context.Context, svc.LaunchHandle) error { return nil }

func copyTree(t *testing.T, src, dst string) {
	t.Helper()
	err := filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		if d.IsDir() {
			if d.Name() == ".storyteller" {
				return filepath.SkipDir
			}
			return os.MkdirAll(filepath.Join(dst, rel), 0o755)
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(dst, rel), b, 0o644)
	})
	if err != nil {
		t.Fatal(err)
	}
}
