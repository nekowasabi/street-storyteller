package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

// Why: Verify zero-value construction so callers can incrementally fill
// optional fields without forced initializers (mirrors TS optional chaining).
func TestPlotZeroValue(t *testing.T) {
	var s domain.Plot
	if s.ID != "" || s.Name != "" || s.Summary != "" {
		t.Fatalf("expected zero strings, got %+v", s)
	}
	if s.Beats != nil {
		t.Fatalf("expected nil Beats by default, got %v", s.Beats)
	}
	if s.FocusCharacters != nil {
		t.Fatalf("expected nil FocusCharacters by default")
	}
	if s.Intersections != nil {
		t.Fatalf("expected nil Intersections by default")
	}
	if s.Importance != nil || s.ParentPlotID != nil {
		t.Fatalf("expected nil pointer optionals")
	}
	if s.DisplayNames != nil || s.Relations != nil || s.Details != nil {
		t.Fatalf("expected nil collections/pointers by default")
	}
}

// Why: Required fields must be settable as plain values so the struct can
// round-trip through CLI/LSP/MCP without builder indirection.
func TestPlotRequiredFields(t *testing.T) {
	beat := domain.PlotBeat{
		ID:                "beat_001",
		Title:             "Opening",
		Summary:           "Hero meets mentor",
		StructurePosition: domain.StructurePositionSetup,
	}
	s := domain.Plot{
		ID:      "main",
		Name:    "Main Plot",
		Type:    domain.PlotTypeMain,
		Status:  domain.PlotStatusActive,
		Summary: "Hero's journey",
		Beats:   []domain.PlotBeat{beat},
	}
	if s.ID != "main" || s.Name != "Main Plot" {
		t.Fatalf("required scalars not stored: %+v", s)
	}
	if s.Type != domain.PlotTypeMain || s.Status != domain.PlotStatusActive {
		t.Fatalf("required enums not stored: %+v", s)
	}
	if len(s.Beats) != 1 || s.Beats[0].ID != "beat_001" {
		t.Fatalf("Beats slice not stored: %+v", s.Beats)
	}
}

// Why: Confirm every Plot enum literal exists with the expected string
// value so JSON round-trip stays compatible with TS source-of-truth.
func TestPlotTypeConstants(t *testing.T) {
	cases := map[domain.PlotType]string{
		domain.PlotTypeMain:       "main",
		domain.PlotTypeSub:        "sub",
		domain.PlotTypeParallel:   "parallel",
		domain.PlotTypeBackground: "background",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("PlotType %q != %q", string(got), want)
		}
	}
}

func TestPlotTypeRejectsLegacySubTypeLiteral(t *testing.T) {
	legacy := "sub" + "plot"
	if domain.IsValidPlotType(domain.PlotType(legacy)) {
		t.Fatalf("legacy plot type %q must be rejected", legacy)
	}
	if !domain.IsValidPlotType(domain.PlotTypeSub) {
		t.Fatal(`plot type "sub" must be accepted`)
	}
}

func TestPlotStatusConstants(t *testing.T) {
	cases := map[domain.PlotStatus]string{
		domain.PlotStatusActive:    "active",
		domain.PlotStatusCompleted: "completed",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("PlotStatus %q != %q", string(got), want)
		}
	}
}

func TestPlotImportanceConstants(t *testing.T) {
	cases := map[domain.PlotImportance]string{
		domain.PlotImportanceMajor: "major",
		domain.PlotImportanceMinor: "minor",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("PlotImportance %q != %q", string(got), want)
		}
	}
}

func TestFocusCharacterPriorityConstants(t *testing.T) {
	cases := map[domain.FocusCharacterPriority]string{
		domain.FocusCharacterPriorityPrimary:   "primary",
		domain.FocusCharacterPrioritySecondary: "secondary",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("FocusCharacterPriority %q != %q", string(got), want)
		}
	}
}

func TestStructurePositionConstants(t *testing.T) {
	// Why: Mirrors src/type/v2/plot.ts BeatStructurePosition (5-stage arc).
	cases := map[domain.StructurePosition]string{
		domain.StructurePositionSetup:      "setup",
		domain.StructurePositionRising:     "rising",
		domain.StructurePositionClimax:     "climax",
		domain.StructurePositionFalling:    "falling",
		domain.StructurePositionResolution: "resolution",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("StructurePosition %q != %q", string(got), want)
		}
	}
}

func TestInfluenceDirectionConstants(t *testing.T) {
	cases := map[domain.InfluenceDirection]string{
		domain.InfluenceDirectionForward:  "forward",
		domain.InfluenceDirectionBackward: "backward",
		domain.InfluenceDirectionMutual:   "mutual",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("InfluenceDirection %q != %q", string(got), want)
		}
	}
}

func TestInfluenceLevelConstants(t *testing.T) {
	cases := map[domain.InfluenceLevel]string{
		domain.InfluenceLevelHigh:   "high",
		domain.InfluenceLevelMedium: "medium",
		domain.InfluenceLevelLow:    "low",
	}
	for got, want := range cases {
		if string(got) != want {
			t.Errorf("InfluenceLevel %q != %q", string(got), want)
		}
	}
}

// Why: PlotBeat must carry required identity fields plus optional cross-entity
// references; this guards against accidental field removal during refactor.
func TestPlotBeatRequiredAndOptional(t *testing.T) {
	timelineEvent := "event_42"
	chapter := "chapter_03"
	beat := domain.PlotBeat{
		ID:                  "beat_010",
		Title:               "Climactic confrontation",
		Summary:             "Hero meets antagonist",
		StructurePosition:   domain.StructurePositionClimax,
		Chapter:             &chapter,
		Characters:          []string{"hero", "villain"},
		Settings:            []string{"throne_room"},
		TimelineEventID:     &timelineEvent,
		PreconditionBeatIDs: []string{"beat_009"},
	}
	if beat.ID != "beat_010" || beat.Title != "Climactic confrontation" {
		t.Fatalf("PlotBeat required fields not stored: %+v", beat)
	}
	if beat.Chapter == nil || *beat.Chapter != "chapter_03" {
		t.Fatalf("Chapter pointer not stored")
	}
	if beat.TimelineEventID == nil || *beat.TimelineEventID != "event_42" {
		t.Fatalf("TimelineEventID pointer not stored")
	}
	if len(beat.Characters) != 2 || beat.Characters[1] != "villain" {
		t.Fatalf("Characters not stored: %v", beat.Characters)
	}
	if len(beat.PreconditionBeatIDs) != 1 {
		t.Fatalf("PreconditionBeatIDs not stored")
	}
}

// Why: Intersection links source/target via plot+beat IDs; tests guard
// the full required-field surface plus the optional InfluenceLevel pointer.
func TestPlotIntersectionRequiredAndOptional(t *testing.T) {
	level := domain.InfluenceLevelHigh
	x := domain.PlotIntersection{
		ID:                 "x_001",
		SourcePlotID:       "main",
		SourceBeatID:       "beat_005",
		TargetPlotID:       "love_story",
		TargetBeatID:       "beat_002",
		Summary:            "Encounter triggers romance",
		InfluenceDirection: domain.InfluenceDirectionForward,
		InfluenceLevel:     &level,
	}
	if x.SourcePlotID != "main" || x.TargetPlotID != "love_story" {
		t.Fatalf("plot refs not stored: %+v", x)
	}
	if x.SourceBeatID != "beat_005" || x.TargetBeatID != "beat_002" {
		t.Fatalf("beat refs not stored: %+v", x)
	}
	if x.InfluenceDirection != domain.InfluenceDirectionForward {
		t.Fatalf("influence direction not stored")
	}
	if x.InfluenceLevel == nil || *x.InfluenceLevel != domain.InfluenceLevelHigh {
		t.Fatalf("influence level pointer not stored")
	}
}

// Why: focusCharacters TS `Record<string, "primary" | "secondary">` maps to
// map[string]FocusCharacterPriority — verify both keys and enum values.
func TestPlotFocusCharactersMap(t *testing.T) {
	s := domain.Plot{
		ID:      "love",
		Name:    "Love Story",
		Type:    domain.PlotTypeSub,
		Status:  domain.PlotStatusActive,
		Summary: "Romance arc",
		Beats:   []domain.PlotBeat{},
		FocusCharacters: map[string]domain.FocusCharacterPriority{
			"hero":     domain.FocusCharacterPriorityPrimary,
			"sidekick": domain.FocusCharacterPrioritySecondary,
		},
	}
	if got := s.FocusCharacters["hero"]; got != domain.FocusCharacterPriorityPrimary {
		t.Fatalf("hero priority = %v, want primary", got)
	}
	if got := s.FocusCharacters["sidekick"]; got != domain.FocusCharacterPrioritySecondary {
		t.Fatalf("sidekick priority = %v, want secondary", got)
	}
}

// Why: PlotRelations carries cross-entity ID lists; required vs optional
// distinction (characters/settings always present, foreshadowings/relatedPlots optional).
func TestPlotRelations(t *testing.T) {
	r := domain.PlotRelations{
		Characters:     []string{"hero", "mentor"},
		Settings:       []string{"village", "castle"},
		Foreshadowings: []string{"ancient_sword"},
		RelatedPlots:   []string{"side_quest"},
	}
	if len(r.Characters) != 2 || len(r.Settings) != 2 {
		t.Fatalf("required relation slices not stored")
	}
	if len(r.Foreshadowings) != 1 || r.Foreshadowings[0] != "ancient_sword" {
		t.Fatalf("Foreshadowings not stored")
	}
	if len(r.RelatedPlots) != 1 {
		t.Fatalf("RelatedPlots not stored")
	}

	// Optional fields default to nil.
	empty := domain.PlotRelations{Characters: []string{}, Settings: []string{}}
	if empty.Foreshadowings != nil || empty.RelatedPlots != nil {
		t.Fatalf("optional relation slices should default to nil")
	}
}

// Why: PlotDetails union `string | { file: string }` is modelled with the
// shared StringOrFileRef helper (Wave-A2-pre集約)。both shapes (Value / File)
// can coexist independently per field.
func TestPlotDetailsStringOrFileUnion(t *testing.T) {
	s := domain.Plot{
		ID:      "main",
		Name:    "Main",
		Type:    domain.PlotTypeMain,
		Status:  domain.PlotStatusActive,
		Summary: "x",
		Beats:   []domain.PlotBeat{},
		Details: &domain.PlotDetails{
			Description: domain.StringOrFileRef{Value: "Inline description"},
		},
	}
	if s.Details.Description.Value != "Inline description" {
		t.Fatalf("inline description not stored")
	}
	if s.Details.Description.IsFile() {
		t.Fatalf("Description should not be file ref when Value is set")
	}

	s.Details.Theme = domain.StringOrFileRef{File: "docs/theme.md"}
	if !s.Details.Theme.IsFile() || s.Details.Theme.File != "docs/theme.md" {
		t.Fatalf("file ref not stored")
	}
}

// Why: parentPlotId/displayNames/intersections live on Plot — exercise
// the optional pointer/slice surface end-to-end.
func TestPlotOptionalSurface(t *testing.T) {
	parent := "main"
	s := domain.Plot{
		ID:           "side",
		Name:         "Side Plot",
		Type:         domain.PlotTypeSub,
		Status:       domain.PlotStatusActive,
		Summary:      "x",
		Beats:        []domain.PlotBeat{},
		ParentPlotID: &parent,
		DisplayNames: []string{"Side Story", "B-plot"},
		Intersections: []domain.PlotIntersection{
			{
				ID:                 "x1",
				SourcePlotID:       "main",
				SourceBeatID:       "b1",
				TargetPlotID:       "side",
				TargetBeatID:       "b2",
				Summary:            "link",
				InfluenceDirection: domain.InfluenceDirectionMutual,
			},
		},
	}
	if s.ParentPlotID == nil || *s.ParentPlotID != "main" {
		t.Fatalf("ParentPlotID not stored")
	}
	if len(s.DisplayNames) != 2 {
		t.Fatalf("DisplayNames not stored")
	}
	if len(s.Intersections) != 1 || s.Intersections[0].InfluenceDirection != domain.InfluenceDirectionMutual {
		t.Fatalf("Intersections not stored")
	}
}
