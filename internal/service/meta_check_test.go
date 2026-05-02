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

// Why: local testdata lives alongside the service package so detail-md fixtures
// do not pollute the shared CLI testdata directory.
func localTestdata(t *testing.T, sub string) string {
	t.Helper()
	abs, err := filepath.Abs(filepath.Join("testdata", sub))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	return abs
}

// TestMetaCheckService_Run_DetailValid checks that a detail md with all three
// required fields passes without error.
func TestMetaCheckService_Run_DetailValid(t *testing.T) {
	svc := service.NewMetaCheckService()
	res, err := svc.Run(localTestdata(t, "detail_valid"))
	if err != nil {
		t.Fatalf("unexpected error for valid detail md: %v", err)
	}
	if res.FilesChecked != 1 {
		t.Fatalf("expected 1 file checked, got %d", res.FilesChecked)
	}
}

// TestMetaCheckService_Run_DetailMissingEntityID checks that a detail md
// missing entity_id yields an error.
func TestMetaCheckService_Run_DetailMissingEntityID(t *testing.T) {
	svc := service.NewMetaCheckService()
	_, err := svc.Run(localTestdata(t, "detail_missing_entity_id"))
	if err == nil {
		t.Fatal("expected error for missing entity_id, got nil")
	}
}

// TestMetaCheckService_Run_DetailInvalidType checks that a detail md with an
// unrecognised type value (e.g. "foo_bar") yields an error.
func TestMetaCheckService_Run_DetailInvalidType(t *testing.T) {
	svc := service.NewMetaCheckService()
	_, err := svc.Run(localTestdata(t, "detail_invalid_type"))
	if err == nil {
		t.Fatal("expected error for invalid type value, got nil")
	}
}

// TestMetaCheckService_Run_ManuscriptValid checks that a plain manuscript md
// (no type field) continues to pass under the new validation logic.
func TestMetaCheckService_Run_ManuscriptValid(t *testing.T) {
	svc := service.NewMetaCheckService()
	res, err := svc.Run(localTestdata(t, "manuscript_valid"))
	if err != nil {
		t.Fatalf("unexpected error for manuscript md: %v", err)
	}
	if res.FilesChecked != 1 {
		t.Fatalf("expected 1 file checked, got %d", res.FilesChecked)
	}
}

// TestMetaCheckService_Run_DetailPlotValid checks that plot_detail is now an
// accepted detail type (added so `storyteller meta annotate` can target plots).
func TestMetaCheckService_Run_DetailPlotValid(t *testing.T) {
	svc := service.NewMetaCheckService()
	res, err := svc.Run(localTestdata(t, "detail_plot_valid"))
	if err != nil {
		t.Fatalf("unexpected error for plot_detail md: %v", err)
	}
	if res.FilesChecked != 1 {
		t.Fatalf("expected 1 file checked, got %d", res.FilesChecked)
	}
}

// TestMetaCheckService_IsValidDetailType verifies the exported predicate covers
// all three allowed types and rejects unknown values.
func TestMetaCheckService_IsValidDetailType(t *testing.T) {
	for _, tt := range []struct {
		typ  string
		want bool
	}{
		{"character_detail", true},
		{"setting_detail", true},
		{"plot_detail", true},
		{"foo_detail", false},
		{"", false},
	} {
		if got := service.IsValidDetailType(tt.typ); got != tt.want {
			t.Errorf("IsValidDetailType(%q) = %v, want %v", tt.typ, got, tt.want)
		}
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
