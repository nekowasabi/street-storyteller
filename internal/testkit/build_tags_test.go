package testkit_test

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Why: Process-100 Wave-pre N0d. scripts/go_coverage.sh の存在/形を assert。

func repoRootForTags(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

func TestGoCoverageScriptIsExecutable(t *testing.T) {
	root := repoRootForTags(t)
	path := filepath.Join(root, "scripts", "go_coverage.sh")
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat scripts/go_coverage.sh: %v", err)
	}
	if info.Mode().Perm()&0o111 == 0 {
		t.Fatalf("scripts/go_coverage.sh is not executable: mode=%v", info.Mode())
	}
	// Why: stub では echo TODO のみ。Wave-A N3 で go test -coverprofile=... を含む実装が入る。
	// 「go test -coverprofile」を含むかで stub vs real を判別。
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read scripts/go_coverage.sh: %v", err)
	}
	if !strings.Contains(string(data), "go test -coverprofile") {
		t.Fatalf("scripts/go_coverage.sh appears to be stub (missing 'go test -coverprofile'); content=%q", string(data))
	}
}
