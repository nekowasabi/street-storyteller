// Package testkit_test contains repository-wide test guards.
//
// Why: process-11 で導入した「default test では実時間 sleep を禁止」というポリシーを
// AST walker で機械的に強制する。CI で go test ./... が走る際にこのテストが失敗すれば
// 違反混入を検出できる。
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

// TestNoTimeSleepInDefaultTests は default build tag のテストファイル内で
// time.Sleep が使われていないことを保証する。
//
// Why: 実時間 sleep は flaky / 遅い CI の原因となるため、
// integration / external タグで明示的に隔離されたテスト以外では禁止する。
// fake clock + Timer interface (testkit/clock) で代替できる。
func TestNoTimeSleepInDefaultTests(t *testing.T) {
	root := repoRoot(t)

	// Why: vendor / .git / node_modules / .rag-docs はプロジェクト管理対象外のため除外する。
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

		// ディレクトリのスキップ判定
		if d.IsDir() {
			if _, skip := skipDirs[d.Name()]; skip {
				return filepath.SkipDir
			}
			return nil
		}

		// *_test.go ファイルのみ対象
		if !strings.HasSuffix(d.Name(), "_test.go") {
			return nil
		}

		fset := token.NewFileSet()
		f, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			// パース失敗は警告のみで継続（生成ファイル等で構文エラーがある場合を考慮）
			// Why: 全走査の途中でパースエラーが出ても他ファイルの検査を止めたくない
			t.Logf("skip (parse error) %s: %v", path, err)
			return nil
		}

		// integration / external タグ付きファイルはスキップ
		if hasIntegrationOrExternalTag(f) {
			return nil
		}

		// time.Sleep の検出
		positions := containsTimeSleep(f, fset)
		for _, pos := range positions {
			violations = append(violations,
				pos.String()+": time.Sleep is forbidden in default-tag tests")
		}

		return nil
	})

	if err != nil {
		t.Fatalf("walk failed: %v", err)
	}

	if len(violations) > 0 {
		t.Errorf("time.Sleep detected in default-tag tests:\n  %s",
			strings.Join(violations, "\n  "))
	}
}

// repoRoot はこのテストファイルから 2 階層上のリポジトリルートを返す。
//
// Why: runtime.Caller(0) でソースファイルパスを取得することで、テスト実行ディレクトリに
// 依存せずリポジトリルートを決定できる。os.Getwd() では go test の実行場所で変わる。
func repoRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("runtime.Caller failed")
	}
	// このファイルは internal/testkit/lint_test.go なので 2 階層上がリポジトリルート
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

// hasIntegrationOrExternalTag は //go:build で integration|external が指定されているか判定する。
//
// Why: integration / external タグのテストは意図的に実時間 IO / 外部通信を行うため、
// time.Sleep を含んでいても許容する。タグで隔離されているため CI の通常実行には含まれない。
func hasIntegrationOrExternalTag(f *ast.File) bool {
	for _, cg := range f.Comments {
		for _, line := range cg.List {
			if strings.HasPrefix(line.Text, "//go:build") {
				if strings.Contains(line.Text, "integration") ||
					strings.Contains(line.Text, "external") {
					return true
				}
			}
		}
	}
	return false
}

// containsTimeSleep は time.Sleep の selector 呼び出しを AST から検出し、
// 該当箇所の token.Position スライスを返す。
//
// Why: ast.Inspect で全ノードを再帰的に走査することで、ネストした関数内の
// time.Sleep も漏れなく検出できる。
func containsTimeSleep(file *ast.File, fset *token.FileSet) []token.Position {
	var positions []token.Position
	ast.Inspect(file, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		x, ok := sel.X.(*ast.Ident)
		if !ok {
			return true
		}
		if x.Name == "time" && sel.Sel.Name == "Sleep" {
			positions = append(positions, fset.Position(call.Pos()))
		}
		return true
	})
	return positions
}
