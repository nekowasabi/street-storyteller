// Why: external test package (manifest_test) で書く。stdlib の `errors` と
// 名前衝突しないよう、本体パッケージは package manifest のままにし、
// 標準 errors を `stderrors` 別名で取り込む流儀 (errors_test と同じ) に揃える。
package manifest_test

import (
	stderrors "errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/manifest"
)

// --- Load: success cases (sample 互換) ---------------------------------------

func TestLoad_CinderellaMinimalManifest(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{"version":"1.0.0"}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.Version != "1.0.0" {
		t.Errorf("Version = %q, want %q", got.Version, "1.0.0")
	}
	// Why: optional path はゼロ値ではなく既定値で埋まる契約。
	if got.Paths.Characters != "src/characters" {
		t.Errorf("Paths.Characters = %q, want default %q", got.Paths.Characters, "src/characters")
	}
}

func TestLoad_MomotaroMinimalManifest(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{"version":"1.0.0"}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.Version != "1.0.0" {
		t.Errorf("Version = %q, want %q", got.Version, "1.0.0")
	}
}

func TestLoad_MisteryMinimalManifest(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{"version":"1.0.0"}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.Version != "1.0.0" {
		t.Errorf("Version = %q, want %q", got.Version, "1.0.0")
	}
}

// --- Load: error cases -------------------------------------------------------

func TestLoad_FileNotFound_ReturnsNotFound(t *testing.T) {
	dir := t.TempDir() // no manifest written

	_, err := manifest.Load(dir)
	if err == nil {
		t.Fatal("Load returned nil error, want NotFound")
	}
	var appErr *apperrors.Error
	if !stderrors.As(err, &appErr) {
		t.Fatalf("err is not *apperrors.Error: %T (%v)", err, err)
	}
	if appErr.Code != apperrors.CodeNotFound {
		t.Errorf("Code = %q, want %q", appErr.Code, apperrors.CodeNotFound)
	}
	if len(appErr.Hints) == 0 {
		t.Error("expected non-empty Hints for NotFound (corrective action)")
	}
}

func TestLoad_InvalidJSON_ReturnsManifestInvalid(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{"version": "1.0.0"`) // missing closing brace

	_, err := manifest.Load(dir)
	if err == nil {
		t.Fatal("Load returned nil error, want ManifestInvalid")
	}
	var appErr *apperrors.Error
	if !stderrors.As(err, &appErr) {
		t.Fatalf("err is not *apperrors.Error: %T (%v)", err, err)
	}
	if appErr.Code != apperrors.CodeManifestInvalid {
		t.Errorf("Code = %q, want %q", appErr.Code, apperrors.CodeManifestInvalid)
	}
	// Why: cause を保持しているか確認。デバッグ時に下層エラーを
	// errors.As で取り出せる必要がある。
	if appErr.Cause == nil {
		t.Error("expected non-nil Cause for invalid JSON")
	}
}

func TestLoad_MissingRequiredField_ReturnsManifestInvalid(t *testing.T) {
	dir := t.TempDir()
	// version 欠落 (必須フィールド)。
	writeFile(t, dir, ".storyteller.json", `{"project":{"name":"foo"}}`)

	_, err := manifest.Load(dir)
	if err == nil {
		t.Fatal("Load returned nil error, want ManifestInvalid")
	}
	var appErr *apperrors.Error
	if !stderrors.As(err, &appErr) {
		t.Fatalf("err is not *apperrors.Error: %T (%v)", err, err)
	}
	if appErr.Code != apperrors.CodeManifestInvalid {
		t.Errorf("Code = %q, want %q", appErr.Code, apperrors.CodeManifestInvalid)
	}
	if !strings.Contains(strings.ToLower(appErr.Message), "version") {
		t.Errorf("Message = %q, expected to mention 'version'", appErr.Message)
	}
}

// --- Load: optional path defaulting & full schema ----------------------------

func TestLoad_AppliesDefaultPaths_WhenPathsOmitted(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{"version":"1"}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	want := manifest.PathConfig{
		Characters:     "src/characters",
		Settings:       "src/settings",
		Foreshadowings: "src/foreshadowings",
		Timelines:      "src/timelines",
		Plots:          "src/plots",
		Manuscripts:    "manuscripts",
	}
	if got.Paths != want {
		t.Errorf("Paths = %+v, want %+v", got.Paths, want)
	}
}

func TestLoad_PartialPathsOverride_KeepsDefaultsForOmitted(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{
		"version": "1",
		"project": {"name": "demo", "description": "d"},
		"paths": {"characters": "story/chars", "manuscripts": "ms"}
	}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.Project.Name != "demo" || got.Project.Description != "d" {
		t.Errorf("Project = %+v, want {demo d}", got.Project)
	}
	if got.Paths.Characters != "story/chars" {
		t.Errorf("Paths.Characters = %q, want %q", got.Paths.Characters, "story/chars")
	}
	if got.Paths.Manuscripts != "ms" {
		t.Errorf("Paths.Manuscripts = %q, want %q", got.Paths.Manuscripts, "ms")
	}
	// Defaults should fill the gaps.
	if got.Paths.Settings != "src/settings" {
		t.Errorf("Paths.Settings = %q, want default %q", got.Paths.Settings, "src/settings")
	}
	if got.Paths.Foreshadowings != "src/foreshadowings" {
		t.Errorf("Paths.Foreshadowings = %q, want default %q", got.Paths.Foreshadowings, "src/foreshadowings")
	}
	if got.Paths.Timelines != "src/timelines" {
		t.Errorf("Paths.Timelines = %q, want default %q", got.Paths.Timelines, "src/timelines")
	}
	if got.Paths.Plots != "src/plots" {
		t.Errorf("Paths.Plots = %q, want default %q", got.Paths.Plots, "src/plots")
	}
}

// --- Load: forward compatibility ---------------------------------------------

func TestLoad_IgnoresUnknownFields(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, ".storyteller.json", `{
		"version": "1.0.0",
		"futureField": {"foo": "bar"},
		"experimental": true
	}`)

	got, err := manifest.Load(dir)
	if err != nil {
		t.Fatalf("Load returned error on unknown fields: %v", err)
	}
	if got.Version != "1.0.0" {
		t.Errorf("Version = %q, want %q", got.Version, "1.0.0")
	}
}

// --- LoadFromBytes -----------------------------------------------------------

func TestLoadFromBytes_ParsesDirectly(t *testing.T) {
	data := []byte(`{
		"version": "1",
		"project": {"name": "p", "description": "x"},
		"paths": {"settings": "world"}
	}`)
	got, err := manifest.LoadFromBytes(data)
	if err != nil {
		t.Fatalf("LoadFromBytes returned error: %v", err)
	}
	if got.Version != "1" {
		t.Errorf("Version = %q, want %q", got.Version, "1")
	}
	if got.Paths.Settings != "world" {
		t.Errorf("Paths.Settings = %q, want %q", got.Paths.Settings, "world")
	}
	if got.Paths.Characters != "src/characters" {
		t.Errorf("Paths.Characters = %q, want default %q", got.Paths.Characters, "src/characters")
	}
}

func TestLoadFromBytes_InvalidJSON_ReturnsManifestInvalid(t *testing.T) {
	_, err := manifest.LoadFromBytes([]byte(`not json`))
	if err == nil {
		t.Fatal("LoadFromBytes returned nil error, want ManifestInvalid")
	}
	var appErr *apperrors.Error
	if !stderrors.As(err, &appErr) {
		t.Fatalf("err is not *apperrors.Error: %T (%v)", err, err)
	}
	if appErr.Code != apperrors.CodeManifestInvalid {
		t.Errorf("Code = %q, want %q", appErr.Code, apperrors.CodeManifestInvalid)
	}
}

// --- helpers -----------------------------------------------------------------

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("writeFile %s: %v", path, err)
	}
}
