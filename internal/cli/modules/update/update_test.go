package update

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

// Why: process-101. update は manifest 検証 + sentinel ファイル生成のみ。
// 正常系 / --check / 不在 manifest / JSON 出力をカバー。

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

func writeManifest(t *testing.T, root string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(root, ".storyteller.json"), []byte(`{"version":"1.0.0"}`), 0644); err != nil {
		t.Fatal(err)
	}
}

func TestUpdate_Apply(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root)

	cmd := New()
	if cmd.Name() != "update" {
		t.Errorf("Name = %q", cmd.Name())
	}
	if cmd.Description() == "" {
		t.Errorf("Description empty")
	}

	cctx, out, errBuf := newCtx(nil, false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "up to date") {
		t.Errorf("missing success: %q", out.String())
	}
	if _, err := os.Stat(filepath.Join(root, ".storyteller-go-ready")); err != nil {
		t.Errorf("sentinel not written: %v", err)
	}
}

func TestUpdate_CheckOnly(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root)
	cctx, _, errBuf := newCtx([]string{"--check"}, false, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if _, err := os.Stat(filepath.Join(root, ".storyteller-go-ready")); !os.IsNotExist(err) {
		t.Errorf("--check should not write sentinel: err=%v", err)
	}
}

func TestUpdate_PathArgs(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root)
	for _, args := range [][]string{
		{"--path", root},
		{"--path=" + root},
	} {
		cctx, _, errBuf := newCtx(args, false, "")
		if code := New().Handle(cctx); code != 0 {
			t.Errorf("args=%v exit=%d stderr=%q", args, code, errBuf.String())
		}
	}
}

func TestUpdate_PathRequiresValue(t *testing.T) {
	cctx, _, errBuf := newCtx([]string{"--path"}, false, "")
	if code := New().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--path") {
		t.Errorf("missing --path error: %q", errBuf.String())
	}
}

func TestUpdate_NoManifest(t *testing.T) {
	root := t.TempDir() // empty
	cctx, _, errBuf := newCtx(nil, false, root)
	if code := New().Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if errBuf.Len() == 0 {
		t.Errorf("expected error msg")
	}
}

func TestUpdate_JSON(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root)
	cctx, out, _ := newCtx(nil, true, root)
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	var payload struct {
		OK   bool   `json:"ok"`
		Path string `json:"path"`
	}
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v out=%q", err, out.String())
	}
	if !payload.OK || payload.Path != root {
		t.Errorf("payload = %+v", payload)
	}
}

func TestUpdate_PathFromCwd(t *testing.T) {
	root := t.TempDir()
	writeManifest(t, root)
	prev, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(prev) })
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	cctx, _, errBuf := newCtx(nil, false, "")
	if code := New().Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func TestUpdate_Usage(t *testing.T) {
	cmd := New().(*Command)
	if !strings.Contains(cmd.Usage(), "update") {
		t.Errorf("usage = %q", cmd.Usage())
	}
}
