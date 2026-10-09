package element

import (
	"os"
	"path/filepath"
	"testing"
)

func TestElementRejectsPathSeparatorsInIDBeforeWriting(t *testing.T) {
	for _, id := range []string{"../../../outside", "../escape", "nested/hero", `..\escape`, `nested\hero`} {
		t.Run(id, func(t *testing.T) {
			base := t.TempDir()
			root := filepath.Join(base, "project")
			ctx, _, stderr := newCtx(t, []string{"--id", id, "--name", "Hero"}, false, root)
			if code := New("character").Handle(ctx); code == 0 {
				t.Errorf("path-like entity ID was accepted: %q; stderr=%q", id, stderr.String())
			}
			entries, err := os.ReadDir(base)
			if err != nil {
				t.Fatal(err)
			}
			if len(entries) != 0 {
				t.Errorf("rejected ID produced filesystem entries: %v", entries)
			}
		})
	}
}

func TestElementRejectsPathSeparatorsInDetailField(t *testing.T) {
	base := t.TempDir()
	root := filepath.Join(base, "project")
	dir := filepath.Join(root, "src", "characters")
	if err := os.MkdirAll(filepath.Join(dir, "hero_"), 0755); err != nil {
		t.Fatal(err)
	}
	ctx, _, stderr := newCtx(t, []string{"--id", "hero", "--separate-files", "/../../../../outside"}, false, root)
	if code := New("character").Handle(ctx); code == 0 {
		t.Errorf("path-like field accepted: %q", stderr.String())
	}
	for _, path := range []string{filepath.Join(base, "outside.md"), filepath.Join(dir, "hero.ts")} {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			t.Errorf("unexpected generated file %s: %v", path, err)
		}
	}
}
