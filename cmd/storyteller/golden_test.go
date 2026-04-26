package main

import (
	"bytes"
	"context"
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// updateGolden controls whether failing tests rewrite their expected files.
// Use `go test -update ./cmd/storyteller/...` to regenerate.
var updateGolden = flag.Bool("update", false, "update golden files")

type goldenCase struct {
	name       string
	args       []string
	wantExit   int
	stdoutFile string
	stderrFile string
}

func runGolden(t *testing.T, args []string) (int, string, string) {
	t.Helper()
	var out, errBuf bytes.Buffer
	deps := cli.Deps{Stdout: &out, Stderr: &errBuf}
	code := runMain(context.Background(), args, deps)
	return code, out.String(), errBuf.String()
}

func goldenPath(name string) string {
	return filepath.Join("testdata", "golden", name)
}

func assertGolden(t *testing.T, file string, got string) {
	t.Helper()
	path := goldenPath(file)
	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(got), 0644); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden %s: %v (run with -update to create)", path, err)
	}
	if string(want) != got {
		t.Fatalf("golden mismatch (%s)\n--- want ---\n%s\n--- got ---\n%s\n--- end ---",
			path, string(want), got)
	}
}

func TestGolden_Version_Text(t *testing.T) {
	code, out, _ := runGolden(t, []string{"version"})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	assertGolden(t, "version_text.txt", out)
}

func TestGolden_Version_JSON(t *testing.T) {
	code, out, _ := runGolden(t, []string{"--json", "version"})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	assertGolden(t, "version_json.txt", out)
}

func TestGolden_Help(t *testing.T) {
	code, out, _ := runGolden(t, []string{"help"})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	assertGolden(t, "help.txt", out)
}

func TestGolden_UnknownCommand(t *testing.T) {
	code, _, errBuf := runGolden(t, []string{"nonexistent"})
	if code != 2 {
		t.Errorf("exit = %d, want 2", code)
	}
	assertGolden(t, "unknown_command.txt", errBuf)
}

func TestGolden_MetaCheck_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	code, out, _ := runGolden(t, []string{"meta", "check", "--path", dir})
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	assertGolden(t, "meta_check_empty.txt", out)
}

func TestGolden_NoArgs(t *testing.T) {
	code, out, _ := runGolden(t, nil)
	if code != 0 {
		t.Errorf("exit = %d", code)
	}
	assertGolden(t, "no_args.txt", out)
}

func TestGolden_GenerateMissingName(t *testing.T) {
	code, _, errBuf := runGolden(t, []string{"generate"})
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
	assertGolden(t, "generate_missing_name.txt", errBuf)
}

func TestGolden_ElementCharacterMissingID(t *testing.T) {
	code, _, errBuf := runGolden(t, []string{"element", "character", "--name", "Hero"})
	if code != 1 {
		t.Errorf("exit = %d, want 1", code)
	}
	assertGolden(t, "element_character_missing_id.txt", errBuf)
}

// silence unused warning when -update is not passed
var _ = goldenCase{}
