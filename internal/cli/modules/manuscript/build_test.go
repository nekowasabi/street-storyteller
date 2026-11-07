package manuscript

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// projectFrom copies the service fixture into a temp project whose drafts/
// holds the chapters, so build has something to gate and somewhere to write.
func projectFrom(t *testing.T, variant string) string {
	t.Helper()
	src, err := filepath.Abs(filepath.Join("..", "..", "..", "service", "testdata", variant))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	root := t.TempDir()
	if err := filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
		rel = strings.Replace(rel, "manuscripts", "drafts", 1)
		dst := filepath.Join(root, rel)
		if info.IsDir() {
			return os.MkdirAll(dst, 0o755)
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(dst, b, 0o644)
	}); err != nil {
		t.Fatalf("copy: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "drafts", "ideas.md"), []byte("# Ideas\n"), 0o644); err != nil {
		t.Fatalf("ideas: %v", err)
	}
	return root
}

func run(t *testing.T, root string) (code int, out, errBuf bytes.Buffer) {
	t.Helper()
	code = NewBuild().Handle(cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--from", filepath.Join(root, "drafts"), "--to", filepath.Join(root, "manuscripts")},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	})
	return code, out, errBuf
}

func TestBuild_PassCopiesManuscriptsOnly(t *testing.T) {
	root := projectFrom(t, "clarity_rainkey")
	code, out, errBuf := run(t, root)
	if code != 0 {
		t.Fatalf("exit = %d, stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "4 manuscripts built") {
		t.Errorf("stdout = %q", out.String())
	}
	for _, ch := range []string{"chapter01.md", "chapter02.md", "chapter03.md", "chapter04.md"} {
		want, _ := os.ReadFile(filepath.Join(root, "drafts", ch))
		got, err := os.ReadFile(filepath.Join(root, "manuscripts", ch))
		if err != nil || !bytes.Equal(want, got) {
			t.Errorf("%s not copied identically: %v", ch, err)
		}
	}
	if _, err := os.Stat(filepath.Join(root, "manuscripts", "ideas.md")); err == nil {
		t.Error("ideas.md (no frontmatter) must not be copied")
	}
}

func TestBuild_FailWritesNothing(t *testing.T) {
	root := projectFrom(t, "clarity_rainkey_break1")
	code, _, errBuf := run(t, root)
	if code != 1 {
		t.Fatalf("exit = %d, want 1", code)
	}
	if !strings.Contains(errBuf.String(), "RDR-102") {
		t.Errorf("stderr = %q", errBuf.String())
	}
	if entries, err := os.ReadDir(filepath.Join(root, "manuscripts")); err == nil && len(entries) > 0 {
		t.Errorf("manuscripts/ must stay empty on failure, got %d files", len(entries))
	}
}

func TestBuild_Idempotent(t *testing.T) {
	root := projectFrom(t, "clarity_rainkey")
	if code, _, e := run(t, root); code != 0 {
		t.Fatalf("first run exit = %d: %s", code, e.String())
	}
	if code, _, e := run(t, root); code != 0 {
		t.Fatalf("second run exit = %d: %s", code, e.String())
	}
}
