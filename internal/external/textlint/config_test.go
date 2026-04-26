package textlint_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/external/textlint"
)

func TestLoadConfig_RCFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".textlintrc"), []byte(`{"rules":{}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := textlint.LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if !cfg.Exists {
		t.Error("Exists = false, want true")
	}
	if cfg.Format != "rc" {
		t.Errorf("Format = %q, want rc", cfg.Format)
	}
	if cfg.Path == "" {
		t.Error("Path is empty")
	}
}

func TestLoadConfig_JSONFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".textlintrc.json"), []byte(`{}`), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := textlint.LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if !cfg.Exists {
		t.Error("Exists = false, want true")
	}
	if cfg.Format != "json" {
		t.Errorf("Format = %q, want json", cfg.Format)
	}
}

func TestLoadConfig_YAMLFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".textlintrc.yml"), []byte("rules: {}"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := textlint.LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if !cfg.Exists {
		t.Error("Exists = false, want true")
	}
	if cfg.Format != "yaml" {
		t.Errorf("Format = %q, want yaml", cfg.Format)
	}
}

func TestLoadConfig_NoFile_GracefulDegrade(t *testing.T) {
	dir := t.TempDir()
	cfg, err := textlint.LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig returned error for missing config: %v", err)
	}
	if cfg.Exists {
		t.Error("Exists = true, want false for missing config")
	}
}
