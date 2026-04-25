package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

// TestForeshadowing_ZeroValue verifies that a zero-value Foreshadowing struct
// can be constructed and that required fields accept their expected types.
func TestForeshadowing_ZeroValue(t *testing.T) {
	f := domain.Foreshadowing{}

	if f.ID != "" {
		t.Errorf("expected zero ID, got %q", f.ID)
	}
	if f.Name != "" {
		t.Errorf("expected zero Name, got %q", f.Name)
	}
	if f.Summary != "" {
		t.Errorf("expected zero Summary, got %q", f.Summary)
	}
	// Status / Type are string-typed enums; zero value is empty string.
	if string(f.Status) != "" {
		t.Errorf("expected zero Status, got %q", f.Status)
	}
	if string(f.Type) != "" {
		t.Errorf("expected zero Type, got %q", f.Type)
	}
	// Optional pointer / slice fields default to nil.
	if f.Importance != nil {
		t.Errorf("expected nil Importance, got %v", f.Importance)
	}
	if f.Resolutions != nil {
		t.Errorf("expected nil Resolutions, got %v", f.Resolutions)
	}
	if f.PlannedResolutionChapter != nil {
		t.Errorf("expected nil PlannedResolutionChapter, got %v", f.PlannedResolutionChapter)
	}
	if f.Relations != nil {
		t.Errorf("expected nil Relations, got %v", f.Relations)
	}
	if f.DisplayNames != nil {
		t.Errorf("expected nil DisplayNames, got %v", f.DisplayNames)
	}
}

// TestForeshadowing_RequiredFieldsAssignable verifies required fields accept
// their expected types when populated.
func TestForeshadowing_RequiredFieldsAssignable(t *testing.T) {
	f := domain.Foreshadowing{
		ID:      "ancient_sword",
		Name:    "古びた剣",
		Type:    domain.ForeshadowingTypeChekhov,
		Summary: "床板の下から発見される剣",
		Planting: domain.PlantingInfo{
			Chapter:     "chapter_01",
			Description: "床板の下から発見",
		},
		Status: domain.ForeshadowingStatusPlanted,
	}

	if f.ID != "ancient_sword" {
		t.Errorf("ID mismatch: got %q", f.ID)
	}
	if f.Type != domain.ForeshadowingTypeChekhov {
		t.Errorf("Type mismatch: got %q", f.Type)
	}
	if f.Status != domain.ForeshadowingStatusPlanted {
		t.Errorf("Status mismatch: got %q", f.Status)
	}
	if f.Planting.Chapter != "chapter_01" {
		t.Errorf("Planting.Chapter mismatch: got %q", f.Planting.Chapter)
	}
	if f.Planting.Description != "床板の下から発見" {
		t.Errorf("Planting.Description mismatch: got %q", f.Planting.Description)
	}
}

// TestForeshadowingStatus_Constants verifies the four status enum values.
func TestForeshadowingStatus_Constants(t *testing.T) {
	cases := []struct {
		got  domain.ForeshadowingStatus
		want string
	}{
		{domain.ForeshadowingStatusPlanted, "planted"},
		{domain.ForeshadowingStatusPartiallyResolved, "partially_resolved"},
		{domain.ForeshadowingStatusResolved, "resolved"},
		{domain.ForeshadowingStatusAbandoned, "abandoned"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("ForeshadowingStatus mismatch: got %q want %q", c.got, c.want)
		}
	}
}

// TestForeshadowingType_Constants verifies the six type enum values.
func TestForeshadowingType_Constants(t *testing.T) {
	cases := []struct {
		got  domain.ForeshadowingType
		want string
	}{
		{domain.ForeshadowingTypeHint, "hint"},
		{domain.ForeshadowingTypeProphecy, "prophecy"},
		{domain.ForeshadowingTypeMystery, "mystery"},
		{domain.ForeshadowingTypeSymbol, "symbol"},
		{domain.ForeshadowingTypeChekhov, "chekhov"},
		{domain.ForeshadowingTypeRedHerring, "red_herring"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("ForeshadowingType mismatch: got %q want %q", c.got, c.want)
		}
	}
}

// TestForeshadowingImportance_Constants verifies the three importance enum values.
func TestForeshadowingImportance_Constants(t *testing.T) {
	cases := []struct {
		got  domain.ForeshadowingImportance
		want string
	}{
		{domain.ForeshadowingImportanceMajor, "major"},
		{domain.ForeshadowingImportanceMinor, "minor"},
		{domain.ForeshadowingImportanceSubtle, "subtle"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("ForeshadowingImportance mismatch: got %q want %q", c.got, c.want)
		}
	}
}

// TestPlantingInfo_ZeroValue verifies PlantingInfo struct shape.
func TestPlantingInfo_ZeroValue(t *testing.T) {
	p := domain.PlantingInfo{}

	if p.Chapter != "" {
		t.Errorf("expected zero Chapter, got %q", p.Chapter)
	}
	if p.Description != "" {
		t.Errorf("expected zero Description, got %q", p.Description)
	}
	if p.Excerpt != nil {
		t.Errorf("expected nil Excerpt, got %v", p.Excerpt)
	}
	if p.EventID != nil {
		t.Errorf("expected nil EventID, got %v", p.EventID)
	}
}

// TestPlantingInfo_ExcerptUnion verifies the inline anonymous struct used to
// represent the `string | { file: string }` union via Excerpt.{Text, FileRef}.
func TestPlantingInfo_ExcerptUnion(t *testing.T) {
	text := "本文からの抜粋"
	p := domain.PlantingInfo{
		Excerpt: &domain.ExcerptValue{Text: &text},
	}
	if p.Excerpt == nil || p.Excerpt.Text == nil || *p.Excerpt.Text != text {
		t.Errorf("Excerpt.Text not preserved: %+v", p.Excerpt)
	}

	p2 := domain.PlantingInfo{
		Excerpt: &domain.ExcerptValue{FileRef: &domain.FileRef{File: "manuscripts/excerpt.md"}},
	}
	if p2.Excerpt == nil || p2.Excerpt.FileRef == nil || p2.Excerpt.FileRef.File != "manuscripts/excerpt.md" {
		t.Errorf("Excerpt.FileRef not preserved: %+v", p2.Excerpt)
	}
}

// TestResolutionInfo_ZeroValue verifies ResolutionInfo struct shape.
func TestResolutionInfo_ZeroValue(t *testing.T) {
	r := domain.ResolutionInfo{}

	if r.Chapter != "" {
		t.Errorf("expected zero Chapter, got %q", r.Chapter)
	}
	if r.Description != "" {
		t.Errorf("expected zero Description, got %q", r.Description)
	}
	if r.Excerpt != nil {
		t.Errorf("expected nil Excerpt, got %v", r.Excerpt)
	}
	if r.EventID != nil {
		t.Errorf("expected nil EventID, got %v", r.EventID)
	}
	if r.Completeness != 0.0 {
		t.Errorf("expected zero Completeness, got %v", r.Completeness)
	}
}

// TestForeshadowing_OptionalResolutions verifies the Resolutions slice supports
// nil (unset) and populated values.
func TestForeshadowing_OptionalResolutions(t *testing.T) {
	f := domain.Foreshadowing{}
	if f.Resolutions != nil {
		t.Errorf("expected nil Resolutions on zero value, got %v", f.Resolutions)
	}

	f.Resolutions = []domain.ResolutionInfo{
		{Chapter: "chapter_05", Description: "剣で扉を開ける", Completeness: 1.0},
	}
	if len(f.Resolutions) != 1 {
		t.Errorf("expected 1 resolution, got %d", len(f.Resolutions))
	}
	if f.Resolutions[0].Completeness != 1.0 {
		t.Errorf("Completeness mismatch: got %v", f.Resolutions[0].Completeness)
	}
}

// TestForeshadowing_OptionalRelations verifies the ForeshadowingRelations
// nested struct can be assigned and inspected.
func TestForeshadowing_OptionalRelations(t *testing.T) {
	f := domain.Foreshadowing{
		Relations: &domain.ForeshadowingRelations{
			Characters:             []string{"hero", "mentor"},
			Settings:               []string{"temple"},
			RelatedForeshadowings:  []string{"prophecy_of_dawn"},
		},
	}
	if f.Relations == nil {
		t.Fatal("expected non-nil Relations")
	}
	if len(f.Relations.Characters) != 2 {
		t.Errorf("expected 2 characters, got %d", len(f.Relations.Characters))
	}
	if len(f.Relations.Settings) != 1 {
		t.Errorf("expected 1 setting, got %d", len(f.Relations.Settings))
	}
	if len(f.Relations.RelatedForeshadowings) != 1 {
		t.Errorf("expected 1 related foreshadowing, got %d", len(f.Relations.RelatedForeshadowings))
	}
}
