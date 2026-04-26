package service_test

import (
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/service"
)

// Why: testdata in internal/cli/modules/meta/testdata/ is the canonical fixture
// for the meta-check pipeline. Reusing it prevents drift between CLI and
// service layer expectations during the upcoming adapter migration.
func testdataPath(t *testing.T, sub string) string {
	t.Helper()
	abs, err := filepath.Abs(filepath.Join("..", "cli", "modules", "meta", "testdata", sub))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	return abs
}

func TestMetaCheckService_Run_Valid(t *testing.T) {
	svc := service.NewMetaCheckService()
	res, err := svc.Run(testdataPath(t, "valid"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.FilesChecked != 1 {
		t.Fatalf("expected 1 file checked, got %d", res.FilesChecked)
	}
}

func TestMetaCheckService_Run_Invalid(t *testing.T) {
	svc := service.NewMetaCheckService()
	_, err := svc.Run(testdataPath(t, "invalid"))
	if err == nil {
		t.Fatalf("expected parse error from invalid frontmatter, got nil")
	}
}

// Why: missing-dir tolerance preserves CLI semantics (fresh project before any
// manuscripts exist must not surface as an error).
func TestMetaCheckService_Run_MissingDir(t *testing.T) {
	svc := service.NewMetaCheckService()
	res, err := svc.Run(filepath.Join(t.TempDir(), "does-not-exist"))
	if err != nil {
		t.Fatalf("expected nil error for missing dir, got %v", err)
	}
	if res.FilesChecked != 0 {
		t.Fatalf("expected 0 files checked, got %d", res.FilesChecked)
	}
}
