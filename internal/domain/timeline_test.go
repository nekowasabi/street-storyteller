package domain_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
)

// TestTimelineZeroValue verifies Timeline can be constructed with required
// fields and remains a plain value type (no constructor needed).
func TestTimelineZeroValue(t *testing.T) {
	tl := domain.Timeline{
		ID:      "main_story",
		Name:    "メインストーリー",
		Scope:   domain.TimelineScopeStory,
		Summary: "物語全体の時系列",
		Events:  []domain.TimelineEvent{},
	}

	if tl.ID != "main_story" {
		t.Errorf("ID = %q, want %q", tl.ID, "main_story")
	}
	if tl.Scope != domain.TimelineScopeStory {
		t.Errorf("Scope = %q, want %q", tl.Scope, domain.TimelineScopeStory)
	}
	if tl.Events == nil {
		t.Error("Events should be non-nil empty slice")
	}

	// Optional fields default to zero values.
	if tl.ParentTimeline != nil {
		t.Error("ParentTimeline should be nil by default")
	}
	if tl.ChildTimelines != nil {
		t.Error("ChildTimelines should be nil by default")
	}
	if tl.RelatedCharacter != nil {
		t.Error("RelatedCharacter should be nil by default")
	}
	if tl.DisplayNames != nil {
		t.Error("DisplayNames should be nil by default")
	}
	if tl.DetectionHints != nil {
		t.Error("DetectionHints should be nil by default")
	}
	if tl.DisplayOptions != nil {
		t.Error("DisplayOptions should be nil by default")
	}
	if tl.Details != nil {
		t.Error("Details should be nil by default")
	}
}

// TestTimelineScopeConstants pins the four scope literal values from
// src/type/v2/timeline.ts so refactors cannot silently rename them.
func TestTimelineScopeConstants(t *testing.T) {
	cases := []struct {
		got  domain.TimelineScope
		want string
	}{
		{domain.TimelineScopeStory, "story"},
		{domain.TimelineScopeWorld, "world"},
		{domain.TimelineScopeCharacter, "character"},
		{domain.TimelineScopeArc, "arc"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("TimelineScope %q, want %q", c.got, c.want)
		}
	}
}

// TestEventCategoryConstants pins all EventCategory literal values.
func TestEventCategoryConstants(t *testing.T) {
	cases := []struct {
		got  domain.EventCategory
		want string
	}{
		{domain.EventCategoryPlotPoint, "plot_point"},
		{domain.EventCategoryCharacterEvent, "character_event"},
		{domain.EventCategoryWorldEvent, "world_event"},
		{domain.EventCategoryBackstory, "backstory"},
		{domain.EventCategoryForeshadow, "foreshadow"},
		{domain.EventCategoryClimax, "climax"},
		{domain.EventCategoryResolution, "resolution"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("EventCategory %q, want %q", c.got, c.want)
		}
	}
}

// TestEventImportanceConstants pins all EventImportance literal values.
func TestEventImportanceConstants(t *testing.T) {
	cases := []struct {
		got  domain.EventImportance
		want string
	}{
		{domain.EventImportanceMajor, "major"},
		{domain.EventImportanceMinor, "minor"},
		{domain.EventImportanceBackground, "background"},
	}
	for _, c := range cases {
		if string(c.got) != c.want {
			t.Errorf("EventImportance %q, want %q", c.got, c.want)
		}
	}
}

// TestTimelineEventZeroValue covers required fields and verifies optional
// causality/importance fields default to nil.
func TestTimelineEventZeroValue(t *testing.T) {
	ev := domain.TimelineEvent{
		ID:       "event_001",
		Title:    "物語の始まり",
		Category: domain.EventCategoryPlotPoint,
		Time:     domain.TimePoint{Order: 1},
		Summary:  "主人公が旅立つ",
		// Cross-entity ID slices are required (non-nil).
		Characters: []string{"hero"},
		Settings:   []string{"royal_capital"},
		Chapters:   []string{"chapter_01"},
	}

	if ev.ID != "event_001" {
		t.Errorf("ID = %q, want %q", ev.ID, "event_001")
	}
	if ev.Category != domain.EventCategoryPlotPoint {
		t.Errorf("Category = %q, want %q", ev.Category, domain.EventCategoryPlotPoint)
	}
	if ev.Time.Order != 1 {
		t.Errorf("Time.Order = %d, want 1", ev.Time.Order)
	}
	if len(ev.Characters) != 1 || ev.Characters[0] != "hero" {
		t.Errorf("Characters = %v, want [hero]", ev.Characters)
	}

	// Optional causality + importance default to nil.
	if ev.CausedBy != nil {
		t.Error("CausedBy should be nil by default")
	}
	if ev.Causes != nil {
		t.Error("Causes should be nil by default")
	}
	if ev.Importance != nil {
		t.Error("Importance should be nil by default")
	}
	if ev.EndTime != nil {
		t.Error("EndTime should be nil by default")
	}
	if ev.DisplayNames != nil {
		t.Error("DisplayNames should be nil by default")
	}
	if ev.Details != nil {
		t.Error("Details should be nil by default")
	}
	if ev.DetectionHints != nil {
		t.Error("DetectionHints should be nil by default")
	}
	if ev.PhaseChanges != nil {
		t.Error("PhaseChanges should be nil by default")
	}
}

// TestTimelineEventCausality verifies CausedBy / Causes accept string ID
// slices (cross-event references stay as IDs, not pointers).
func TestTimelineEventCausality(t *testing.T) {
	importance := domain.EventImportanceMajor
	ev := domain.TimelineEvent{
		ID:         "event_002",
		Title:      "決戦",
		Category:   domain.EventCategoryClimax,
		Time:       domain.TimePoint{Order: 10},
		Summary:    "最終決戦",
		Characters: []string{"hero", "villain"},
		Settings:   []string{"final_arena"},
		Chapters:   []string{"chapter_10"},
		CausedBy:   []string{"event_001"},
		Causes:     []string{"event_003"},
		Importance: &importance,
	}

	if got := ev.CausedBy; len(got) != 1 || got[0] != "event_001" {
		t.Errorf("CausedBy = %v, want [event_001]", got)
	}
	if got := ev.Causes; len(got) != 1 || got[0] != "event_003" {
		t.Errorf("Causes = %v, want [event_003]", got)
	}
	if ev.Importance == nil || *ev.Importance != domain.EventImportanceMajor {
		t.Errorf("Importance = %v, want major", ev.Importance)
	}
}

// TestTimePointOptionalFields verifies optional label/date/chapter use
// pointers (TS optional scalar -> Go pointer).
func TestTimePointOptionalFields(t *testing.T) {
	label := "第1日目"
	date := "1024-03-15"
	chapter := "chapter_01"
	tp := domain.TimePoint{
		Order:   1,
		Label:   &label,
		Date:    &date,
		Chapter: &chapter,
	}

	if tp.Order != 1 {
		t.Errorf("Order = %d, want 1", tp.Order)
	}
	if tp.Label == nil || *tp.Label != "第1日目" {
		t.Errorf("Label = %v, want %q", tp.Label, label)
	}
	if tp.Date == nil || *tp.Date != "1024-03-15" {
		t.Errorf("Date = %v, want %q", tp.Date, date)
	}

	// Zero TimePoint should have all-nil optionals.
	zero := domain.TimePoint{Order: 0}
	if zero.Label != nil || zero.Date != nil || zero.Chapter != nil {
		t.Error("zero TimePoint optionals should all be nil")
	}
}

// TestTimelineDetectionHints verifies the LSP hint struct mirrors the TS
// shape and is attachable as a pointer to Timeline.
func TestTimelineDetectionHints(t *testing.T) {
	hints := &domain.TimelineDetectionHints{
		CommonPatterns:  []string{"main story"},
		ExcludePatterns: []string{},
		Confidence:      0.85,
	}
	tl := domain.Timeline{
		ID:             "main_story",
		Name:           "メイン",
		Scope:          domain.TimelineScopeStory,
		Summary:        "概要",
		Events:         []domain.TimelineEvent{},
		DetectionHints: hints,
	}

	if tl.DetectionHints == nil {
		t.Fatal("DetectionHints should not be nil")
	}
	if tl.DetectionHints.Confidence != 0.85 {
		t.Errorf("Confidence = %f, want 0.85", tl.DetectionHints.Confidence)
	}
}

// TestTimelineDetailsFileRefUnion verifies the string|{file:string} union
// is modelled with the shared StringOrFileRef helper (Wave-A2-pre集約)。
func TestTimelineDetailsFileRefUnion(t *testing.T) {
	d := &domain.TimelineDetails{
		Background: &domain.StringOrFileRef{Value: "短い背景説明"},
		Notes:      &domain.StringOrFileRef{File: "notes.md"},
	}

	if d.Background == nil || d.Background.Value != "短い背景説明" {
		t.Errorf("Background.Value = %v, want 短い背景説明", d.Background)
	}
	if d.Notes == nil || d.Notes.File != "notes.md" {
		t.Errorf("Notes.File = %v, want notes.md", d.Notes)
	}
	if !d.Notes.IsFile() {
		t.Errorf("Notes should be reported as file ref")
	}
}

// TestPhaseChangeInfo confirms event-driven phase transitions can reference
// character / phase IDs as plain strings.
func TestPhaseChangeInfo(t *testing.T) {
	from := "phase_initial"
	desc := "覚醒"
	pc := domain.PhaseChangeInfo{
		CharacterID: "hero",
		ToPhaseID:   "phase_awakened",
		FromPhaseID: &from,
		Description: &desc,
	}
	if pc.CharacterID != "hero" || pc.ToPhaseID != "phase_awakened" {
		t.Errorf("PhaseChangeInfo = %+v", pc)
	}
	if pc.FromPhaseID == nil || *pc.FromPhaseID != from {
		t.Errorf("FromPhaseID = %v, want %q", pc.FromPhaseID, from)
	}
}
