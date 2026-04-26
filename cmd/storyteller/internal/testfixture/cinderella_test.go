package testfixture

import (
	"os"
	"path/filepath"
	"testing"
)

// Why: process-101 coverage. fixture 生成の smoke test。

func TestCinderellaMinimal(t *testing.T) {
	root := t.TempDir()
	if err := CinderellaMinimal(root); err != nil {
		t.Fatalf("CinderellaMinimal: %v", err)
	}
	for _, rel := range []string{
		".storyteller.json",
		"src/characters/cinderella.ts",
		"src/settings/castle.ts",
		"manuscripts/chapter01.md",
	} {
		if _, err := os.Stat(filepath.Join(root, rel)); err != nil {
			t.Errorf("missing %q: %v", rel, err)
		}
	}
}

func TestCinderellaMinimal_BadRoot(t *testing.T) {
	// Why: 存在しないかつ書き込めないパス → MkdirAll 失敗を踏む
	if err := CinderellaMinimal("/proc/cinderella-cannot-create"); err == nil {
		t.Skip("expected mkdir error on /proc, got nil (env-dependent)")
	}
}
