package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

// TestStringOrFileRef_ZeroValue verifies the zero value reports as empty
// and not as a file reference.
func TestStringOrFileRef_ZeroValue(t *testing.T) {
	var s domain.StringOrFileRef
	if !s.IsEmpty() {
		t.Errorf("zero StringOrFileRef.IsEmpty() = false, want true")
	}
	if s.IsFile() {
		t.Errorf("zero StringOrFileRef.IsFile() = true, want false")
	}
}

// TestStringOrFileRef_InlineValue verifies an inline literal is reported as
// non-empty and not as a file reference.
func TestStringOrFileRef_InlineValue(t *testing.T) {
	s := domain.StringOrFileRef{Value: "inline text"}
	if s.IsEmpty() {
		t.Errorf("IsEmpty() = true for inline value, want false")
	}
	if s.IsFile() {
		t.Errorf("IsFile() = true for inline value, want false")
	}
}

// TestStringOrFileRef_FileRef verifies a file path is reported as a file
// reference and not empty.
func TestStringOrFileRef_FileRef(t *testing.T) {
	s := domain.StringOrFileRef{File: "docs/notes.md"}
	if s.IsEmpty() {
		t.Errorf("IsEmpty() = true for file ref, want false")
	}
	if !s.IsFile() {
		t.Errorf("IsFile() = false for file ref, want true")
	}
}

// TestStringOrFileRef_FilePrecedence verifies that when both Value and File
// are set, IsFile() takes precedence (file ref semantics win).
//
// Why: empirically convenient for callers — populating Value as a fallback
// caption while still pointing at a file should not flip IsFile() to false.
func TestStringOrFileRef_FilePrecedence(t *testing.T) {
	s := domain.StringOrFileRef{Value: "fallback", File: "docs/notes.md"}
	if !s.IsFile() {
		t.Errorf("IsFile() = false when File is set, want true")
	}
	if s.IsEmpty() {
		t.Errorf("IsEmpty() = true when File is set, want false")
	}
}
