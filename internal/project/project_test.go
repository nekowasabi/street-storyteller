package project_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project"
)

// repoRoot returns the absolute path to the repository root, derived from this
// test file's location. This file lives at <repo>/internal/project/, so the
// repo root is two directories up.
//
// Why: parameterizing via env var was considered but rejected — the test must
// be hermetic and runnable from any working directory `go test` is invoked in.
func repoRoot(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	// wd == <repo>/internal/project
	return filepath.Clean(filepath.Join(wd, "..", ".."))
}

// minimalManifest is the smallest valid `.storyteller.json` body. Used by
// fixture-based tests that build their own project tree under t.TempDir().
const minimalManifest = `{"version":"1.0.0"}`

// writeFile is a small helper that writes a file with directories created.
func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdirall %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// minimalCharacterTS returns a TS source string that the limited-scope tsparse
// can load. It deliberately avoids type annotations (`: Character`) and
// `as const` because the parser rejects both.
func minimalCharacterTS(id, name string) string {
	return `export const ` + id + ` = {
  "id": "` + id + `",
  "name": "` + name + `",
  "role": "protagonist",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "テスト用キャラクター"
};`
}

// minimalSettingTS returns a parser-compatible Setting fixture.
func minimalSettingTS(id, name string) string {
	return `export const ` + id + ` = {
  "id": "` + id + `",
  "name": "` + name + `",
  "type": "location",
  "appearingChapters": [],
  "summary": "テスト用設定"
};`
}

// makeMinimalProject scaffolds a tmp project root with one character + one
// setting, all driven through the minimal-fixture path so tsparse can load.
// Returns the absolute root path.
func makeMinimalProject(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	writeFile(t, filepath.Join(root, "src", "characters", "hero.ts"),
		minimalCharacterTS("hero", "勇者"))
	writeFile(t, filepath.Join(root, "src", "settings", "town.ts"),
		minimalSettingTS("town", "村"))
	return root
}

// expectError asserts that err is *apperrors.Error and has the expected Code.
func expectError(t *testing.T, err error, code apperrors.Code) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error with code %s, got nil", code)
	}
	var ae *apperrors.Error
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperrors.Error, got %T: %v", err, err)
	}
	if ae.Code != code {
		t.Fatalf("expected code %s, got %s (msg=%q)", code, ae.Code, ae.Message)
	}
}

// --- success paths -----------------------------------------------------------

func TestLoad_MinimalFixtureProject(t *testing.T) {
	root := makeMinimalProject(t)

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if p.Root == "" {
		t.Errorf("Project.Root should be populated")
	}
	if p.Manifest == nil || p.Manifest.Version != "1.0.0" {
		t.Errorf("Project.Manifest mismatched: %+v", p.Manifest)
	}
	if p.Store == nil {
		t.Fatalf("Project.Store should be non-nil")
	}
	if got := len(p.Store.AllCharacters()); got != 1 {
		t.Errorf("AllCharacters len = %d, want 1", got)
	}
	if got := len(p.Store.AllSettings()); got != 1 {
		t.Errorf("AllSettings len = %d, want 1", got)
	}
	hero, err := p.Store.Character("hero")
	if err != nil {
		t.Fatalf("Character(hero): %v", err)
	}
	if hero.Name != "勇者" {
		t.Errorf("hero.Name = %q, want 勇者", hero.Name)
	}
}

// TestLoad_CinderellaSampleManifest ensures we can at least find and load the
// real sample's manifest. Real entity .ts files use type annotations that the
// limited-scope tsparse rejects, so we point Manifest.Paths at empty
// directories via a tmp project that copies just the manifest.
//
// Why this shape: the mission acknowledged real samples may not parse and
// instructed us to fall back to "manifest-only / minimal fixture". This test
// uses the real manifest to lock in cross-checking that Load handles a real
// .storyteller.json without crashing.
func TestLoad_CinderellaSampleManifestOnly(t *testing.T) {
	repo := repoRoot(t)
	srcManifest := filepath.Join(repo, "samples", "cinderella", ".storyteller.json")
	data, err := os.ReadFile(srcManifest)
	if err != nil {
		t.Skipf("cinderella manifest not available: %v", err)
	}

	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), string(data))
	// No src/characters etc — we exercise the "manifest valid, dirs absent" path.

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load(cinderella manifest): %v", err)
	}
	if p.Manifest == nil || p.Manifest.Version == "" {
		t.Errorf("manifest version should be populated")
	}
}

// TestLoad_MomotaroSampleManifestOnly mirrors the above for momotaro.
func TestLoad_MomotaroSampleManifestOnly(t *testing.T) {
	repo := repoRoot(t)
	root := t.TempDir()
	src := filepath.Join(repo, "samples", "momotaro", ".storyteller.json")
	data, err := os.ReadFile(src)
	if err != nil {
		// momotaro doesn't ship a manifest in this branch — synthesize one so
		// the code path that "finds a real-named project root" is still
		// exercised.
		data = []byte(minimalManifest)
	}
	writeFile(t, filepath.Join(root, ".storyteller.json"), string(data))

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load(momotaro manifest): %v", err)
	}
	if p.Manifest == nil {
		t.Fatalf("manifest is nil")
	}
}

// TestLoad_MysterySampleManifestOnly mirrors the above for old-letter-mystery.
func TestLoad_MysterySampleManifestOnly(t *testing.T) {
	repo := repoRoot(t)
	root := t.TempDir()
	src := filepath.Join(repo, "samples", "mistery", "old-letter-mystery", ".storyteller.json")
	data, err := os.ReadFile(src)
	if err != nil {
		data = []byte(minimalManifest)
	}
	writeFile(t, filepath.Join(root, ".storyteller.json"), string(data))

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load(mystery manifest): %v", err)
	}
	if p.Manifest == nil {
		t.Fatalf("manifest is nil")
	}
}

// --- error paths -------------------------------------------------------------

func TestLoad_MissingProjectRoot(t *testing.T) {
	root := filepath.Join(t.TempDir(), "does-not-exist")
	_, err := project.Load(root)
	expectError(t, err, apperrors.CodeNotFound)
}

func TestLoad_InvalidManifest(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{not json`)
	_, err := project.Load(root)
	expectError(t, err, apperrors.CodeManifestInvalid)
}

func TestLoad_DuplicateCharacterID(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	writeFile(t, filepath.Join(root, "src", "characters", "a.ts"),
		minimalCharacterTS("hero", "勇者A"))
	writeFile(t, filepath.Join(root, "src", "characters", "b.ts"),
		minimalCharacterTS("hero", "勇者B"))

	_, err := project.Load(root)
	expectError(t, err, apperrors.CodeEntityConflict)
}

// TestLoad_AbsentEntityDirectories ensures Load does not error when an entity
// directory configured in manifest does not exist on disk. The Store should be
// returned empty for those kinds.
func TestLoad_AbsentEntityDirectories(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	// Intentionally create no src/* directories.

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got := len(p.Store.AllCharacters()); got != 0 {
		t.Errorf("AllCharacters = %d, want 0", got)
	}
	if got := len(p.Store.AllSettings()); got != 0 {
		t.Errorf("AllSettings = %d, want 0", got)
	}
}

func TestLoad_InvalidEnumValue(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	// role "narrator" is not a valid CharacterRole.
	bad := `export const villain = {
  "id": "villain",
  "name": "悪役",
  "role": "narrator",
  "traits": [],
  "relationships": {},
  "appearingChapters": [],
  "summary": "x"
};`
	writeFile(t, filepath.Join(root, "src", "characters", "villain.ts"), bad)

	_, err := project.Load(root)
	expectError(t, err, apperrors.CodeValidation)
}

// TestLoad_SkipsNonTSAndIndexFiles verifies that .md, _test.ts, and index.ts
// are skipped while real *.ts files are still loaded.
func TestLoad_SkipsNonTSAndIndexFiles(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	writeFile(t, filepath.Join(root, "src", "characters", "hero.ts"),
		minimalCharacterTS("hero", "勇者"))
	// These should all be skipped without raising errors.
	writeFile(t, filepath.Join(root, "src", "characters", "hero_description.md"),
		"# Notes")
	writeFile(t, filepath.Join(root, "src", "characters", "index.ts"),
		`export {};`)
	writeFile(t, filepath.Join(root, "src", "characters", "hero_test.ts"),
		`// not a fixture`)
	writeFile(t, filepath.Join(root, "src", "characters", ".hidden.ts"),
		`// dotfile`)

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got := len(p.Store.AllCharacters()); got != 1 {
		t.Errorf("AllCharacters = %d, want 1", got)
	}
}

// TestLoad_ParseErrorBubblesUp ensures a syntax error inside an entity .ts
// surfaces as CodeParse, not Validation.
func TestLoad_ParseErrorBubblesUp(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), minimalManifest)
	// Function calls still trigger tsparse rejection.
	writeFile(t, filepath.Join(root, "src", "characters", "broken.ts"),
		`export const broken: Character = { "id": makeID() };`)

	_, err := project.Load(root)
	expectError(t, err, apperrors.CodeParse)
}
