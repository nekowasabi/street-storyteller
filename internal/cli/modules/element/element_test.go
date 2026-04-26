package element

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

// Why: process-101 coverage gate. element 配下は CLI のエントリ層で
// ロジック自体は薄いので、各 kind の正常系 1 ケースと代表的な
// エラーパスを smoke test で押さえる。

func newCtx(t *testing.T, args []string, jsonMode bool, root string) (cli.CommandContext, *bytes.Buffer, *bytes.Buffer) {
	t.Helper()
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

func TestElement_AllKinds_Success(t *testing.T) {
	root := t.TempDir()
	cases := []struct {
		kind   string
		subDir string
	}{
		{"character", "src/characters"},
		{"setting", "src/settings"},
		{"timeline", "src/timelines"},
		{"foreshadowing", "src/foreshadowings"},
		{"subplot", "src/subplots"},
		{"beat", "src/subplots"},
		{"intersection", "src/subplots"},
		{"phase", "src/characters"},
		{"misc", "src/miscs"}, // default branch
	}
	for _, tc := range cases {
		t.Run(tc.kind, func(t *testing.T) {
			cmd := New(tc.kind)
			if !strings.Contains(cmd.Name(), tc.kind) {
				t.Errorf("Name = %q", cmd.Name())
			}
			if cmd.Description() == "" {
				t.Errorf("Description empty")
			}
			cctx, out, errBuf := newCtx(t, []string{"--id", "x_" + tc.kind, "--name", "X", "--summary", "s", "--role", "supporting"}, false, root)
			if code := cmd.Handle(cctx); code != 0 {
				t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
			}
			expected := filepath.Join(root, tc.subDir, "x_"+tc.kind+".ts")
			if _, err := os.Stat(expected); err != nil {
				t.Errorf("expected file %q not created: %v", expected, err)
			}
			if !strings.Contains(out.String(), "created") {
				t.Errorf("missing success message: %q", out.String())
			}
		})
	}
}

func TestElement_JSONOutput(t *testing.T) {
	root := t.TempDir()
	cmd := New("character")
	cctx, out, _ := newCtx(t, []string{"--id", "hero", "--name=Hero", "--role=protagonist", "--summary=brave"}, true, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	var payload struct {
		Kind string `json:"kind"`
		ID   string `json:"id"`
		Path string `json:"path"`
	}
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v out=%q", err, out.String())
	}
	if payload.Kind != "character" || payload.ID != "hero" || payload.Path == "" {
		t.Errorf("payload = %+v", payload)
	}
}

func TestElement_MissingID(t *testing.T) {
	cmd := New("character")
	cctx, _, errBuf := newCtx(t, []string{"--name", "x"}, false, t.TempDir())
	if code := cmd.Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--id") {
		t.Errorf("missing --id error: %q", errBuf.String())
	}
}

func TestElement_NameDefaultsToID(t *testing.T) {
	root := t.TempDir()
	cmd := New("character")
	// only --id, no --name
	cctx, _, errBuf := newCtx(t, []string{"--id", "alice"}, false, root)
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	body, err := os.ReadFile(filepath.Join(root, "src/characters/alice.ts"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), `name: "alice"`) {
		t.Errorf("name not defaulted: %q", body)
	}
}

func TestElement_ParseErrors(t *testing.T) {
	cmd := New("character")
	cases := [][]string{
		{"--id"},      // missing value
		{"--name"},    // missing value
		{"--role"},    // missing value
		{"--summary"}, // missing value
		{"--path"},    // missing value
	}
	for _, args := range cases {
		t.Run(args[0], func(t *testing.T) {
			cctx, _, errBuf := newCtx(t, args, false, "")
			if code := cmd.Handle(cctx); code != 1 {
				t.Fatalf("exit=%d want 1", code)
			}
			if errBuf.Len() == 0 {
				t.Errorf("expected error msg")
			}
		})
	}
}

func TestElement_PathFromCwd(t *testing.T) {
	// Why: GlobalOpts.Path 空 → os.Getwd フォールバック branch を踏む
	root := t.TempDir()
	prev, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(prev) })
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	cmd := New("character")
	cctx, _, errBuf := newCtx(t, []string{"--id", "h"}, false, "")
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if _, err := os.Stat(filepath.Join(root, "src/characters/h.ts")); err != nil {
		t.Errorf("file not at cwd: %v", err)
	}
}

func TestElement_PathOverride(t *testing.T) {
	override := t.TempDir()
	cmd := New("setting")
	cctx, _, _ := newCtx(t, []string{"--id=loc", "--path=" + override}, false, "/should/be/ignored")
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d", code)
	}
	if _, err := os.Stat(filepath.Join(override, "src/settings/loc.ts")); err != nil {
		t.Errorf("override path not used: %v", err)
	}
}

func TestElement_Usage(t *testing.T) {
	cmd := New("character").(*Command)
	if !strings.Contains(cmd.Usage(), "character") {
		t.Errorf("usage = %q", cmd.Usage())
	}
}
