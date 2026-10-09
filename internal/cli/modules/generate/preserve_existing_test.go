package generate

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGeneratePreservesExistingProject(t *testing.T) {
	base := t.TempDir()
	ctx, _, stderr := newCtx([]string{"--name", "story"}, false, base)
	if code := New().Handle(ctx); code != 0 {
		t.Fatalf("initial generation failed: %s", stderr.String())
	}
	path := filepath.Join(base, "story", "manuscripts", "chapter01.md")
	const original = "# My chapter\n\nThis prose must survive repeated commands.\n"
	if err := os.WriteFile(path, []byte(original), 0644); err != nil {
		t.Fatal(err)
	}
	ctx, _, stderr = newCtx([]string{"--name", "story"}, false, base)
	if code := New().Handle(ctx); code == 0 {
		t.Errorf("expected existing project to be rejected: %s", stderr.String())
	}
	got, err := os.ReadFile(path)
	if err != nil || string(got) != original {
		t.Errorf("authored manuscript changed: body=%q err=%v", got, err)
	}
}
