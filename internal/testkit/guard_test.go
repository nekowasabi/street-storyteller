package testkit_test

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// TestNoOsExecImportInDefaultTests は default build tag のテストファイル内で
// os/exec を import していないことを保証する。
//
// Why: 外部コマンド (textlint, npx, git, deno) を直接呼ぶテストは flaky で
// CI 環境依存になりやすいため、testkit/process パッケージの ProcessRunner
// (Real/Fake) interface 経由で抽象化することを強制する。違反 import は
// integration / external タグで明示隔離されたファイルのみ許可。
func TestNoOsExecImportInDefaultTests(t *testing.T) {
	root := findRepoRootForGuard(t)

	skipDirs := map[string]struct{}{
		".git":         {},
		"node_modules": {},
		"vendor":       {},
		".rag-docs":    {},
	}

	var violations []string
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if _, skip := skipDirs[d.Name()]; skip {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(d.Name(), "_test.go") {
			return nil
		}
		fset := token.NewFileSet()
		f, perr := parser.ParseFile(fset, path, nil, parser.ParseComments|parser.ImportsOnly)
		if perr != nil {
			t.Logf("skip %s: parse error: %v", path, perr)
			return nil
		}
		if hasNonDefaultBuildTagForGuard(f) {
			return nil
		}
		for _, imp := range f.Imports {
			if imp.Path == nil {
				continue
			}
			if strings.Trim(imp.Path.Value, "\"") == "os/exec" {
				violations = append(violations, fset.Position(imp.Pos()).String()+": os/exec import is forbidden in default-tag tests")
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk failed: %v", err)
	}
	if len(violations) > 0 {
		t.Errorf("os/exec detected in default-tag tests:\n  %s", strings.Join(violations, "\n  "))
	}
}

// findRepoRootForGuard はこのファイルから 2 階層上のリポジトリルートを返す。
//
// Why: W1-A (lint_test.go) と並列マージされた際の helper 名衝突を避けるため、
// guard 専用名で定義する。Refactor フェーズで共通化する余地はあるが、
// Red Phase では並列性を優先して重複を許容する。
func findRepoRootForGuard(t *testing.T) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

// hasNonDefaultBuildTagForGuard は //go:build に integration / external が含まれるか判定。
func hasNonDefaultBuildTagForGuard(f *ast.File) bool {
	for _, c := range f.Comments {
		for _, line := range c.List {
			if strings.HasPrefix(line.Text, "//go:build") {
				if strings.Contains(line.Text, "integration") || strings.Contains(line.Text, "external") {
					return true
				}
			}
		}
	}
	return false
}
