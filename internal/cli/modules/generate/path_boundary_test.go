package generate

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateRejectsPathLikeNamesBeforeWriting(t *testing.T) {
	for _, name := range []string{".", "..", "../outside", "nested/story", `..\outside`, `nested\story`} {
		t.Run(name, func(t *testing.T) {
			base := t.TempDir()
			root := filepath.Join(base, "requested")
			ctx, _, stderr := newCtx([]string{"--name", name}, false, root)
			if code := New().Handle(ctx); code == 0 {
				t.Errorf("path-like name accepted: %q; stderr=%q", name, stderr.String())
			}
			entries, err := os.ReadDir(base)
			if err != nil {
				t.Fatal(err)
			}
			if len(entries) != 0 {
				t.Errorf("rejected name created filesystem entries: %v", entries)
			}
		})
	}
}

func TestGenerateAcceptsOrdinaryLeafNames(t *testing.T) {
	for _, name := range []string{"story-name", "story name", "勇者", ".draft"} {
		t.Run(name, func(t *testing.T) {
			root := t.TempDir()
			ctx, _, stderr := newCtx([]string{"--name", name}, false, root)
			if code := New().Handle(ctx); code != 0 {
				t.Fatalf("valid name rejected: %q; stderr=%q", name, stderr.String())
			}
			if _, err := os.Stat(filepath.Join(root, name, ".storyteller.json")); err != nil {
				t.Fatal(err)
			}
		})
	}
}
