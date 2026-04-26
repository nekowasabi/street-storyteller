package generate

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// Why: process-101. generate コマンドはプロジェクト雛形作成。
// テンプレート分岐とエラーパスを smoke test で押さえる。

func newCtx(args []string, jsonMode bool, root string) (cli.CommandContext, *bytes.Buffer, *bytes.Buffer) {
	var out, errBuf bytes.Buffer
	var p cli.Presenter
	if jsonMode {
		p = cli.NewJSONPresenter(&out)
	} else {
		p = cli.NewTextPresenter(&out, &errBuf)
	}
	return cli.CommandContext{
		Ctx:        context.Background(),
		Args:       args,
		Presenter:  p,
		Deps:       cli.Deps{Stdout: &out, Stderr: &errBuf},
		GlobalOpts: cli.GlobalOptions{JSON: jsonMode, Path: root},
	}, &out, &errBuf
}

func TestGenerate_DefaultTemplate(t *testing.T) {
	root := t.TempDir()
	cmd := New()
	if cmd.Name() != "generate" {
		t.Errorf("Name = %q", cmd.Name())
	}
	if cmd.Description() == "" {
		t.Errorf("Description empty")
	}

	cctx, out, errBuf := newCtx([]string{"--name", "demo"}, false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "generated") {
		t.Errorf("missing success: %q", out.String())
	}
	if _, err := os.Stat(filepath.Join(root, "demo", ".storyteller.json")); err != nil {
		t.Errorf("project not created: %v", err)
	}
}

func TestGenerate_AllTemplates(t *testing.T) {
	for _, tmpl := range []string{"basic", "novel", "screenplay", "unknown_template"} {
		t.Run(tmpl, func(t *testing.T) {
			root := t.TempDir()
			cctx, _, errBuf := newCtx([]string{"--name=p", "--template=" + tmpl}, false, root)
			if code := New().Handle(cctx); code != 0 {
				t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
			}
		})
	}
}

func TestGenerate_JSONOutput(t *testing.T) {
	root := t.TempDir()
	cctx, out, _ := newCtx([]string{"--name=demo"}, true, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	var payload struct {
		Path     string `json:"path"`
		Template string `json:"template"`
	}
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v out=%q", err, out.String())
	}
	if payload.Path == "" || payload.Template == "" {
		t.Errorf("payload = %+v", payload)
	}
}

func TestGenerate_MissingName(t *testing.T) {
	cctx, _, errBuf := newCtx(nil, false, t.TempDir())
	if code := New().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--name") {
		t.Errorf("missing --name error: %q", errBuf.String())
	}
}

func TestGenerate_ParseErrors(t *testing.T) {
	for _, args := range [][]string{{"--name"}, {"--path"}, {"--template"}} {
		cctx, _, errBuf := newCtx(args, false, "")
		if code := New().Handle(cctx); code != 1 {
			t.Errorf("args=%v exit=%d want 1", args, code)
		}
		if errBuf.Len() == 0 {
			t.Errorf("args=%v expected error msg", args)
		}
	}
}

func TestGenerate_EqualsForms(t *testing.T) {
	root := t.TempDir()
	cctx, _, errBuf := newCtx([]string{"--name=p2", "--path=" + root, "--template=basic"}, false, "")
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func TestGenerate_PathFromCwd(t *testing.T) {
	root := t.TempDir()
	prev, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(prev) })
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	cctx, _, errBuf := newCtx([]string{"--name=p"}, false, "")
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func TestGenerate_Usage(t *testing.T) {
	cmd := New().(*Command)
	if !strings.Contains(cmd.Usage(), "generate") {
		t.Errorf("usage = %q", cmd.Usage())
	}
}
