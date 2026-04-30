package migrate

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

func newCtx(args []string, root string) (cli.CommandContext, *bytes.Buffer, *bytes.Buffer) {
	var out, errBuf bytes.Buffer
	return cli.CommandContext{
		Ctx:        context.Background(),
		Args:       args,
		Presenter:  cli.NewTextPresenter(&out, &errBuf),
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{Path: root},
	}, &out, &errBuf
}

func writeLegacyProject(t *testing.T, root string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(root, "src", "subplots"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "manuscripts"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".storyteller.json"), []byte(`{"version":"1.0.0","paths":{"subplots":"src/subplots"}}`), 0644); err != nil {
		t.Fatal(err)
	}
	src := `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const love: Subplot = {
  id: "love",
  name: "Love",
  type: "subplot",
  status: "active",
  summary: "Romance",
  beats: [],
};
`
	if err := os.WriteFile(filepath.Join(root, "src", "subplots", "love.ts"), []byte(src), 0644); err != nil {
		t.Fatal(err)
	}
	md := "---\nsubplots:\n  - love\n---\n# Chapter\n"
	if err := os.WriteFile(filepath.Join(root, "manuscripts", "chapter01.md"), []byte(md), 0644); err != nil {
		t.Fatal(err)
	}
}

func TestMigratePlotRename_DryRun(t *testing.T) {
	root := t.TempDir()
	writeLegacyProject(t, root)

	cctx, out, errBuf := newCtx([]string{"plot-rename"}, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "dry-run") || !strings.Contains(out.String(), "src/subplots -> src/plots") {
		t.Fatalf("unexpected output: %q", out.String())
	}
	if !strings.Contains(out.String(), "3 files to update") {
		t.Fatalf("dry-run output should include update count: %q", out.String())
	}
	if _, err := os.Stat(filepath.Join(root, "src", "subplots", "love.ts")); err != nil {
		t.Fatalf("dry-run changed source file: %v", err)
	}
}

func TestMigratePlotRename_DryRunNoChanges(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "src", "plots"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".storyteller.json"), []byte(`{"version":"1.0.0","paths":{"plots":"src/plots"}}`), 0644); err != nil {
		t.Fatal(err)
	}

	cctx, out, errBuf := newCtx([]string{"plot-rename"}, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "0 files to update") {
		t.Fatalf("dry-run output should include zero update count: %q", out.String())
	}
}

func TestMigratePlotRename_Apply(t *testing.T) {
	root := t.TempDir()
	writeLegacyProject(t, root)

	cctx, _, errBuf := newCtx([]string{"plot-rename", "--apply", "--allow-dirty"}, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	plotPath := filepath.Join(root, "src", "plots", "love.ts")
	data, err := os.ReadFile(plotPath)
	if err != nil {
		t.Fatalf("read migrated plot: %v", err)
	}
	text := string(data)
	for _, want := range []string{"Plot", "@storyteller/types/v2/plot.ts", `type: "sub"`} {
		if !strings.Contains(text, want) {
			t.Errorf("migrated TS missing %q:\n%s", want, text)
		}
	}
	md, err := os.ReadFile(filepath.Join(root, "manuscripts", "chapter01.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(md), "plots:") || strings.Contains(string(md), "subplots:") {
		t.Errorf("frontmatter not migrated:\n%s", string(md))
	}
}

func TestMigratePlotRename_ApplyConvertsSubtypeToSub(t *testing.T) {
	root := t.TempDir()
	writeLegacyProject(t, root)

	cctx, _, errBuf := newCtx([]string{"plot-rename", "--apply", "--allow-dirty"}, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	data, err := os.ReadFile(filepath.Join(root, "src", "plots", "love.ts"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), `type: "sub"`) {
		t.Fatalf("legacy subtype was not migrated to sub:\n%s", string(data))
	}
	if strings.Contains(string(data), `type: "subplot"`) || strings.Contains(string(data), `type: "plot"`) {
		t.Fatalf("legacy or entity-name type literal leaked:\n%s", string(data))
	}
}

func TestMigratePlotRename_RejectsDirtyGitWorktree(t *testing.T) {
	root := t.TempDir()
	writeLegacyProject(t, root)
	oldGitStatus := gitStatusPorcelain
	gitStatusPorcelain = func(string) ([]byte, error) { return []byte(" M src/subplots/love.ts\n"), nil }
	t.Cleanup(func() { gitStatusPorcelain = oldGitStatus })

	cctx, _, errBuf := newCtx([]string{"plot-rename", "--apply"}, root)
	if code := New().Handle(cctx); code == 0 {
		t.Fatal("expected dirty git worktree to fail")
	}
	if !strings.Contains(errBuf.String(), "Please commit or stash changes before migration") {
		t.Fatalf("unexpected error: %q", errBuf.String())
	}
}

func TestMigratePlotRename_RejectsInconsistentPlotDirectories(t *testing.T) {
	root := t.TempDir()
	writeLegacyProject(t, root)
	if err := os.MkdirAll(filepath.Join(root, "src", "plots"), 0755); err != nil {
		t.Fatal(err)
	}

	cctx, _, errBuf := newCtx([]string{"plot-rename", "--apply", "--allow-dirty"}, root)
	if code := New().Handle(cctx); code == 0 {
		t.Fatal("expected inconsistent directories to fail")
	}
	if !strings.Contains(errBuf.String(), "both src/subplots and src/plots exist") {
		t.Fatalf("unexpected error: %q", errBuf.String())
	}
}

func TestMigratePlotRename_UnknownSubcommand(t *testing.T) {
	cctx, _, errBuf := newCtx([]string{"unknown"}, t.TempDir())
	if code := New().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "plot-rename") {
		t.Errorf("missing help: %q", errBuf.String())
	}
}
