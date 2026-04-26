package service_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/service"
)

func TestValidateService_Run_NilCatalog(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "chapter01.md")
	body := "@勇者は剣を抜いた。\n"
	if err := os.WriteFile(file, []byte(body), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	svc := service.NewValidateService()
	// Why: nil-catalog short-circuit must yield zero detections without error,
	// preserving the contract documented in detect/reference.go (Phase 1 guard).
	res, err := svc.Run(file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res) != 0 {
		t.Fatalf("expected 0 detections with nil catalog, got %d", len(res))
	}
}

func TestValidateService_Run_MissingFile(t *testing.T) {
	svc := service.NewValidateService()
	_, err := svc.Run(filepath.Join(t.TempDir(), "missing.md"))
	if err == nil {
		t.Fatalf("expected error for missing file, got nil")
	}
}

func TestValidateService_Run_EmptyPath(t *testing.T) {
	svc := service.NewValidateService()
	_, err := svc.Run("")
	if err == nil {
		t.Fatalf("expected error for empty path, got nil")
	}
}
