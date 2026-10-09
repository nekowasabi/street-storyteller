package lint

import (
	"bytes"
	"context"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

type recordingWorker struct {
	paths []string
}

func (w *recordingWorker) Lint(_ context.Context, path string, _ []byte) ([]textlint.Message, error) {
	w.paths = append(w.paths, path)
	return nil, nil
}

func TestLintHonorsPathThroughCLI(t *testing.T) {
	for _, form := range []string{"separate", "equals", "before-command"} {
		t.Run(form, func(t *testing.T) {
			root := makeProject(t)
			file := filepath.Join(root, "chapter01.md")
			worker := &recordingWorker{}
			registry := cli.NewRegistry()
			if err := registry.Register("lint", newTestCommand(worker, process.NewFakeRunner())); err != nil {
				t.Fatal(err)
			}
			args := []string{"lint", "--path", file}
			if form == "equals" {
				args = []string{"lint", "--path=" + file}
			} else if form == "before-command" {
				args = []string{"--path", file, "lint"}
			}
			var out, stderr bytes.Buffer
			if code := cli.RunWithRegistry(context.Background(), args, cli.Deps{Stdout: &out, Stderr: &stderr}, registry); code != 0 {
				t.Fatalf("exit=%d stderr=%q", code, stderr.String())
			}
			if !reflect.DeepEqual(worker.paths, []string{file}) {
				t.Fatalf("linted %v, want only %s", worker.paths, file)
			}
		})
	}
}
