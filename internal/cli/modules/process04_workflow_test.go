package modules_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/cli/modules"
)

func TestGenerateAndElementWorkflow(t *testing.T) {
	root := t.TempDir()

	code, out, errOut := runCLIForProcess04(t, []string{"generate", "--name", "demo", "--path", root})
	if code != 0 {
		t.Fatalf("generate exit=%d stdout=%q stderr=%q", code, out, errOut)
	}
	projectRoot := filepath.Join(root, "demo")
	for _, rel := range []string{
		".storyteller.json",
		"story.ts",
		"story.config.ts",
		"README.md",
		"src/characters",
		"src/settings",
		"src/timelines",
		"src/foreshadowings",
		"src/subplots",
		"manuscripts",
		"drafts",
		"output",
		"tests",
	} {
		if _, err := os.Stat(filepath.Join(projectRoot, rel)); err != nil {
			t.Fatalf("generated project missing %s: %v", rel, err)
		}
	}

	code, _, errOut = runCLIForProcess04(t, []string{
		"element", "character",
		"--path", projectRoot,
		"--id", "hero",
		"--name", "勇者",
		"--role", "protagonist",
		"--summary", "正義感の強い主人公",
	})
	if code != 0 {
		t.Fatalf("element character exit=%d stderr=%q", code, errOut)
	}
	characterFile := filepath.Join(projectRoot, "src", "characters", "hero.ts")
	data, err := os.ReadFile(characterFile)
	if err != nil {
		t.Fatalf("character file was not created: %v", err)
	}
	if !strings.Contains(string(data), `export const hero: Character`) {
		t.Fatalf("character file does not contain typed export: %s", data)
	}

	code, out, errOut = runCLIForProcess04(t, []string{"view", "list", "--path", projectRoot, "--kind", "characters"})
	if code != 0 {
		t.Fatalf("view list exit=%d stdout=%q stderr=%q", code, out, errOut)
	}
	if !strings.Contains(out, "hero") || !strings.Contains(out, "勇者") {
		t.Fatalf("view list output does not include created character: %q", out)
	}
}

func runCLIForProcess04(t *testing.T, args []string) (int, string, string) {
	t.Helper()
	var stdout, stderr bytes.Buffer
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		t.Fatalf("RegisterCore: %v", err)
	}
	code := cli.RunWithRegistry(context.Background(), args, cli.Deps{
		Stdout: &stdout,
		Stderr: &stderr,
	}, r)
	return code, stdout.String(), stderr.String()
}
