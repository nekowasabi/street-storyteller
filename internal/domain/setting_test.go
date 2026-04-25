package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

// TestSetting_ZeroValue verifies a Setting can be constructed from its zero value
// without panic and exposes empty defaults for collections / pointers.
func TestSetting_ZeroValue(t *testing.T) {
	var s domain.Setting

	if s.ID != "" {
		t.Errorf("zero Setting.ID = %q, want empty", s.ID)
	}
	if s.Name != "" {
		t.Errorf("zero Setting.Name = %q, want empty", s.Name)
	}
	if s.Summary != "" {
		t.Errorf("zero Setting.Summary = %q, want empty", s.Summary)
	}
	if s.AppearingChapters != nil {
		t.Errorf("zero Setting.AppearingChapters = %v, want nil", s.AppearingChapters)
	}
	if s.DisplayNames != nil {
		t.Errorf("zero Setting.DisplayNames = %v, want nil", s.DisplayNames)
	}
	if s.Details != nil {
		t.Errorf("zero Setting.Details = %v, want nil", s.Details)
	}
	if s.RelatedSettings != nil {
		t.Errorf("zero Setting.RelatedSettings = %v, want nil", s.RelatedSettings)
	}
	if s.DetectionHints != nil {
		t.Errorf("zero Setting.DetectionHints = %v, want nil", s.DetectionHints)
	}
}

// TestSetting_RequiredFields verifies all required metadata fields can be set.
func TestSetting_RequiredFields(t *testing.T) {
	s := domain.Setting{
		ID:                "royal_capital",
		Name:              "王都",
		Type:              domain.SettingTypeLocation,
		AppearingChapters: []string{"chapter_01", "chapter_02"},
		Summary:           "王国の首都",
	}

	if s.ID != "royal_capital" {
		t.Errorf("Setting.ID = %q, want %q", s.ID, "royal_capital")
	}
	if s.Name != "王都" {
		t.Errorf("Setting.Name = %q, want %q", s.Name, "王都")
	}
	if s.Type != domain.SettingTypeLocation {
		t.Errorf("Setting.Type = %q, want %q", s.Type, domain.SettingTypeLocation)
	}
	if len(s.AppearingChapters) != 2 {
		t.Errorf("len(Setting.AppearingChapters) = %d, want 2", len(s.AppearingChapters))
	}
	if s.Summary != "王国の首都" {
		t.Errorf("Setting.Summary = %q, want %q", s.Summary, "王国の首都")
	}
}

// TestSettingType_EnumConstants verifies each TS literal value maps to an
// exported SettingType constant of type SettingType.
func TestSettingType_EnumConstants(t *testing.T) {
	cases := []struct {
		got  domain.SettingType
		want string
	}{
		{domain.SettingTypeLocation, "location"},
		{domain.SettingTypeWorld, "world"},
		{domain.SettingTypeCulture, "culture"},
		{domain.SettingTypeOrganization, "organization"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("SettingType const = %q, want %q", string(c.got), c.want)
		}
	}
}

// TestSetting_OptionalDetails verifies each Details field accepts nil
// individually and inline value via the string|FileRef union struct.
func TestSetting_OptionalDetails(t *testing.T) {
	d := domain.SettingDetails{}

	// All fields nil by default.
	if d.Description != nil {
		t.Errorf("Description = %v, want nil", d.Description)
	}
	if d.Geography != nil {
		t.Errorf("Geography = %v, want nil", d.Geography)
	}
	if d.History != nil {
		t.Errorf("History = %v, want nil", d.History)
	}
	if d.Culture != nil {
		t.Errorf("Culture = %v, want nil", d.Culture)
	}
	if d.Politics != nil {
		t.Errorf("Politics = %v, want nil", d.Politics)
	}
	if d.Economy != nil {
		t.Errorf("Economy = %v, want nil", d.Economy)
	}
	if d.Inhabitants != nil {
		t.Errorf("Inhabitants = %v, want nil", d.Inhabitants)
	}
	if d.Landmarks != nil {
		t.Errorf("Landmarks = %v, want nil", d.Landmarks)
	}

	// Inline value (Value set, File empty) and FileRef (File set, Value empty).
	d.Description = &domain.StringOrFileRef{Value: "歴史ある都"}
	d.Geography = &domain.StringOrFileRef{File: "docs/geography.md"}

	if d.Description == nil || d.Description.Value != "歴史ある都" {
		t.Errorf("Description inline assignment failed: %+v", d.Description)
	}
	if d.Geography == nil || d.Geography.File != "docs/geography.md" {
		t.Errorf("Geography file-ref assignment failed: %+v", d.Geography)
	}
}

// TestSetting_OptionalDisplayNames verifies DisplayNames can be assigned a slice
// and remains nil-able.
func TestSetting_OptionalDisplayNames(t *testing.T) {
	s := domain.Setting{}
	if s.DisplayNames != nil {
		t.Errorf("DisplayNames = %v, want nil", s.DisplayNames)
	}

	s.DisplayNames = []string{"王都", "首都"}
	if len(s.DisplayNames) != 2 {
		t.Errorf("len(DisplayNames) = %d, want 2", len(s.DisplayNames))
	}
}

// TestSetting_OptionalDetectionHints verifies DetectionHints is a pointer that
// accepts nil and a populated value.
func TestSetting_OptionalDetectionHints(t *testing.T) {
	s := domain.Setting{}
	if s.DetectionHints != nil {
		t.Errorf("DetectionHints = %v, want nil", s.DetectionHints)
	}

	s.DetectionHints = &domain.SettingDetectionHints{
		CommonPatterns:  []string{"王都の", "王都で"},
		ExcludePatterns: []string{},
		Confidence:      0.85,
	}
	if s.DetectionHints == nil {
		t.Fatal("DetectionHints assignment failed")
	}
	if s.DetectionHints.Confidence != 0.85 {
		t.Errorf("Confidence = %v, want 0.85", s.DetectionHints.Confidence)
	}
}
