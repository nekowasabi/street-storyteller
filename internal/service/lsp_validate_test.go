package service_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/service"
)

func TestValidateService_Run_MissingFile(t *testing.T) {
	svc := service.NewValidateService()
	_, err := svc.Run(context.Background(), "", filepath.Join(t.TempDir(), "missing.md"))
	if err == nil {
		t.Fatalf("expected error for missing file, got nil")
	}
}

func TestValidateService_Run_EmptyPath(t *testing.T) {
	svc := service.NewValidateService()
	_, err := svc.Run(context.Background(), "", "")
	if err == nil {
		t.Fatalf("expected error for empty path, got nil")
	}
}
