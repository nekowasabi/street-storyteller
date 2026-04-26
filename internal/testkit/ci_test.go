package testkit_test

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Why: Process-100 Wave-pre N0d. yaml.v3 lib を導入せず、
//      標準ライブラリのみで .github/workflows/ci.yml を line ベースで解析する。
//      go.mod に依存追加しない surgical change を保つため。
//      repoRoot は同 package の lint_test.go (line 94) で定義済のため再利用する。

func readCIWorkflow(t *testing.T) string {
	t.Helper()
	root := repoRoot(t)
	path := filepath.Join(root, ".github", "workflows", "ci.yml")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read ci.yml: %v", err)
	}
	return string(data)
}

// extractTopLevelJobNames は ci.yml の jobs: ブロックから top-level job key を抽出する。
// インデント 2 スペース直下の "[a-z][a-z0-9_-]*:" を job 名と見なす。
func extractTopLevelJobNames(yaml string) []string {
	jobsRe := regexp.MustCompile(`(?m)^jobs:\s*$`)
	loc := jobsRe.FindStringIndex(yaml)
	if loc == nil {
		return nil
	}
	body := yaml[loc[1]:]
	lines := strings.Split(body, "\n")
	jobRe := regexp.MustCompile(`^  ([a-z][a-z0-9_-]*):\s*$`)
	var names []string
	for _, line := range lines {
		// jobs: の後、別の top-level セクション (インデントなし非空白) が来たら終了
		if len(line) > 0 && line[0] != ' ' && line[0] != '#' && strings.TrimSpace(line) != "" {
			break
		}
		if m := jobRe.FindStringSubmatch(line); m != nil {
			names = append(names, m[1])
		}
	}
	return names
}

// extractJobBlock は jobs.<name> ブロックの本文を返す。次の同じインデントの job または
// top-level セクションで終了。
func extractJobBlock(yaml, jobName string) string {
	startRe := regexp.MustCompile(`(?m)^  ` + regexp.QuoteMeta(jobName) + `:\s*$`)
	loc := startRe.FindStringIndex(yaml)
	if loc == nil {
		return ""
	}
	body := yaml[loc[1]:]
	lines := strings.Split(body, "\n")
	endRe := regexp.MustCompile(`^  [a-z][a-z0-9_-]*:\s*$`)
	var collected []string
	for _, line := range lines {
		if endRe.MatchString(line) {
			break
		}
		if len(line) > 0 && line[0] != ' ' && line[0] != '#' && strings.TrimSpace(line) != "" {
			break
		}
		collected = append(collected, line)
	}
	return strings.Join(collected, "\n")
}

func TestCIWorkflowHas5Jobs(t *testing.T) {
	yaml := readCIWorkflow(t)
	names := extractTopLevelJobNames(yaml)
	got := make(map[string]bool, len(names))
	for _, n := range names {
		got[n] = true
	}
	required := []string{"test", "integration", "external", "coverage", "lint"}
	missing := []string{}
	for _, r := range required {
		if !got[r] {
			missing = append(missing, r)
		}
	}
	if len(missing) > 0 {
		t.Fatalf("ci.yml missing required jobs: %v (got=%v)", missing, names)
	}
}

func TestCIDefaultJobExcludesExternalTag(t *testing.T) {
	yaml := readCIWorkflow(t)
	block := extractJobBlock(yaml, "test")
	if block == "" {
		t.Fatal("ci.yml has no 'test' job block")
	}
	if strings.Contains(block, "-tags=external") {
		t.Fatalf("default 'test' job must not use -tags=external; block=%q", block)
	}
}

func TestCIExternalJobEmitsMachineDetectableSkip(t *testing.T) {
	yaml := readCIWorkflow(t)
	block := extractJobBlock(yaml, "external")
	if block == "" {
		t.Fatal("ci.yml has no 'external' job block")
	}
	if !strings.Contains(block, "EXTERNAL_SKIP_REASON=") {
		t.Fatalf("external job must emit EXTERNAL_SKIP_REASON= log for machine-detectable skip; block=%q", block)
	}
}
