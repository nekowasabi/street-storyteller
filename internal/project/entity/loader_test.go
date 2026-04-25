package entity_test

import (
	"errors"
	"strings"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/entity"
)

// Why: Sample TS files in samples/cinderella ship `: TypeName` annotations,
// which `tsparse.ParseExportConst` rejects on purpose. The fixtures below mimic
// the literal payload (object body) but drop the annotation — that's how the
// Wave-A2 mapping works in practice (annotations are stripped before parsing).

func TestLoadCharacter_minimal(t *testing.T) {
	src := `export const cinderella = {
		id: "cinderella",
		name: "シンデレラ",
		role: "protagonist",
		traits: ["優しい", "忍耐強い"],
		relationships: { "stepmother": "enemy", "prince": "romantic" },
		appearingChapters: ["chapter_01"],
		summary: "継母にいじめられながらも優しさを失わない少女",
	};`

	got, err := entity.LoadCharacter(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadCharacter: unexpected error: %v", err)
	}
	if got.ID != "cinderella" {
		t.Errorf("ID = %q, want %q", got.ID, "cinderella")
	}
	if got.Name != "シンデレラ" {
		t.Errorf("Name = %q, want %q", got.Name, "シンデレラ")
	}
	if got.Role != "protagonist" {
		t.Errorf("Role = %q, want protagonist", got.Role)
	}
	if len(got.Traits) != 2 || got.Traits[0] != "優しい" || got.Traits[1] != "忍耐強い" {
		t.Errorf("Traits = %v", got.Traits)
	}
	if got.Relationships["stepmother"] != "enemy" {
		t.Errorf("Relationships[stepmother] = %q", got.Relationships["stepmother"])
	}
	if got.Relationships["prince"] != "romantic" {
		t.Errorf("Relationships[prince] = %q", got.Relationships["prince"])
	}
	if len(got.AppearingChapters) != 1 || got.AppearingChapters[0] != "chapter_01" {
		t.Errorf("AppearingChapters = %v", got.AppearingChapters)
	}
	if got.Summary == "" {
		t.Errorf("Summary should not be empty")
	}
}

func TestLoadCharacter_withDetailsFileRef(t *testing.T) {
	src := `export const c = {
		id: "c",
		name: "C",
		role: "supporting",
		traits: [],
		relationships: {},
		appearingChapters: [],
		summary: "s",
		displayNames: ["C-san"],
		aliases: ["Cee"],
		details: {
			description: { file: "./c.md" },
			personality: "明るい",
		},
		detectionHints: {
			commonPatterns: ["C"],
			excludePatterns: [],
			confidence: 0.8,
		},
	};`

	got, err := entity.LoadCharacter(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadCharacter: %v", err)
	}
	if len(got.DisplayNames) != 1 || got.DisplayNames[0] != "C-san" {
		t.Errorf("DisplayNames = %v", got.DisplayNames)
	}
	if len(got.Aliases) != 1 || got.Aliases[0] != "Cee" {
		t.Errorf("Aliases = %v", got.Aliases)
	}
	if got.Details == nil {
		t.Fatalf("Details = nil, want non-nil")
	}
	if got.Details.Description.File != "./c.md" {
		t.Errorf("Details.Description.File = %q", got.Details.Description.File)
	}
	if got.Details.Personality.Value != "明るい" {
		t.Errorf("Details.Personality.Value = %q", got.Details.Personality.Value)
	}
	if got.DetectionHints == nil {
		t.Fatalf("DetectionHints = nil")
	}
	if got.DetectionHints.Confidence != 0.8 {
		t.Errorf("DetectionHints.Confidence = %v", got.DetectionHints.Confidence)
	}
	if len(got.DetectionHints.CommonPatterns) != 1 || got.DetectionHints.CommonPatterns[0] != "C" {
		t.Errorf("CommonPatterns = %v", got.DetectionHints.CommonPatterns)
	}
}

func TestLoadCharacter_unknownEnumValue_isValidationError(t *testing.T) {
	src := `export const x = {
		id: "x", name: "X", role: "wizard",
		traits: [], relationships: {}, appearingChapters: [], summary: "s",
	};`
	_, err := entity.LoadCharacter(strings.NewReader(src))
	if err == nil {
		t.Fatalf("expected validation error for unknown role")
	}
	var ae *apperrors.Error
	if !errors.As(err, &ae) {
		t.Fatalf("error type = %T, want *apperrors.Error", err)
	}
	if ae.Code != apperrors.CodeValidation {
		t.Errorf("error code = %q, want %q", ae.Code, apperrors.CodeValidation)
	}
}

func TestLoadCharacter_parseError_isParseCode(t *testing.T) {
	src := `export const broken = { id: "x", name: ` // truncated
	_, err := entity.LoadCharacter(strings.NewReader(src))
	if err == nil {
		t.Fatalf("expected parse error")
	}
	var ae *apperrors.Error
	if !errors.As(err, &ae) {
		t.Fatalf("error type = %T, want *apperrors.Error", err)
	}
	if ae.Code != apperrors.CodeParse {
		t.Errorf("error code = %q, want %q", ae.Code, apperrors.CodeParse)
	}
}

func TestLoadSetting_minimal(t *testing.T) {
	src := `export const castle = {
		id: "castle",
		name: "城",
		type: "location",
		appearingChapters: ["chapter_03"],
		summary: "王子の住まう城",
		displayNames: ["お城"],
		details: { description: "豪華な城" },
		relatedSettings: ["kingdom"],
	};`

	got, err := entity.LoadSetting(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadSetting: %v", err)
	}
	if got.ID != "castle" || got.Name != "城" || got.Type != "location" {
		t.Errorf("got = %+v", got)
	}
	if len(got.AppearingChapters) != 1 || got.AppearingChapters[0] != "chapter_03" {
		t.Errorf("AppearingChapters = %v", got.AppearingChapters)
	}
	if got.Details == nil || got.Details.Description == nil || got.Details.Description.Value != "豪華な城" {
		t.Errorf("Details.Description = %+v", got.Details)
	}
	if len(got.RelatedSettings) != 1 || got.RelatedSettings[0] != "kingdom" {
		t.Errorf("RelatedSettings = %v", got.RelatedSettings)
	}
}

func TestLoadSetting_unknownType(t *testing.T) {
	src := `export const x = { id: "x", name: "X", type: "wibble", appearingChapters: [], summary: "s" };`
	_, err := entity.LoadSetting(strings.NewReader(src))
	if err == nil {
		t.Fatalf("expected validation error")
	}
	var ae *apperrors.Error
	if !errors.As(err, &ae) || ae.Code != apperrors.CodeValidation {
		t.Errorf("err = %v, want CodeValidation", err)
	}
}

func TestLoadForeshadowing_minimal(t *testing.T) {
	src := `export const slipper = {
		id: "glass_slipper",
		name: "ガラスの靴",
		type: "chekhov",
		summary: "舞踏会で落とすガラスの靴",
		planting: {
			chapter: "chapter_02",
			description: "妖精から授けられる",
			excerpt: { file: "./slipper.md" },
		},
		status: "resolved",
		importance: "major",
		resolutions: [
			{
				chapter: "chapter_05",
				description: "シンデレラの足に合う",
				completeness: 1.0,
			},
		],
		plannedResolutionChapter: "chapter_05",
		relations: {
			characters: ["cinderella", "prince"],
			settings: ["castle"],
		},
		displayNames: ["靴"],
	};`

	got, err := entity.LoadForeshadowing(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadForeshadowing: %v", err)
	}
	if got.ID != "glass_slipper" || got.Type != "chekhov" || got.Status != "resolved" {
		t.Errorf("got = %+v", got)
	}
	if got.Planting.Chapter != "chapter_02" {
		t.Errorf("Planting.Chapter = %q", got.Planting.Chapter)
	}
	if got.Planting.Excerpt == nil || got.Planting.Excerpt.File != "./slipper.md" {
		t.Errorf("Planting.Excerpt = %+v", got.Planting.Excerpt)
	}
	if got.Importance == nil || *got.Importance != "major" {
		t.Errorf("Importance = %v", got.Importance)
	}
	if len(got.Resolutions) != 1 || got.Resolutions[0].Completeness != 1.0 {
		t.Errorf("Resolutions = %+v", got.Resolutions)
	}
	if got.PlannedResolutionChapter == nil || *got.PlannedResolutionChapter != "chapter_05" {
		t.Errorf("PlannedResolutionChapter = %v", got.PlannedResolutionChapter)
	}
	if got.Relations == nil || len(got.Relations.Characters) != 2 {
		t.Errorf("Relations = %+v", got.Relations)
	}
}

func TestLoadTimeline_minimal(t *testing.T) {
	src := `export const main = {
		id: "main_story",
		name: "メイン",
		scope: "story",
		summary: "概要",
		events: [
			{
				id: "e1",
				title: "出来事1",
				category: "plot_point",
				time: { order: 1, label: "序盤" },
				summary: "概要1",
				characters: ["cinderella"],
				settings: ["mansion"],
				chapters: [],
				importance: "major",
			},
			{
				id: "e2",
				title: "出来事2",
				category: "climax",
				time: { order: 2 },
				summary: "概要2",
				characters: [],
				settings: [],
				chapters: ["chapter_03"],
				causedBy: ["e1"],
			},
		],
	};`

	got, err := entity.LoadTimeline(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadTimeline: %v", err)
	}
	if got.ID != "main_story" || got.Scope != "story" {
		t.Errorf("got = %+v", got)
	}
	if len(got.Events) != 2 {
		t.Fatalf("Events = %d, want 2", len(got.Events))
	}
	e1 := got.Events[0]
	if e1.ID != "e1" || e1.Category != "plot_point" || e1.Time.Order != 1 {
		t.Errorf("e1 = %+v", e1)
	}
	if e1.Time.Label == nil || *e1.Time.Label != "序盤" {
		t.Errorf("e1.Time.Label = %v", e1.Time.Label)
	}
	if e1.Importance == nil || *e1.Importance != "major" {
		t.Errorf("e1.Importance = %v", e1.Importance)
	}
	e2 := got.Events[1]
	if len(e2.CausedBy) != 1 || e2.CausedBy[0] != "e1" {
		t.Errorf("e2.CausedBy = %v", e2.CausedBy)
	}
}

func TestLoadSubplot_minimal(t *testing.T) {
	src := `export const growth = {
		id: "growth",
		name: "成長",
		type: "subplot",
		status: "active",
		summary: "主人公の成長",
		beats: [
			{
				id: "b1",
				title: "出会い",
				summary: "運命の出会い",
				structurePosition: "setup",
				characters: ["cinderella"],
				settings: ["mansion"],
			},
		],
		focusCharacters: { "cinderella": "primary", "prince": "secondary" },
		intersections: [
			{
				id: "i1",
				sourceSubplotId: "growth",
				sourceBeatId: "b1",
				targetSubplotId: "search",
				targetBeatId: "b1",
				summary: "交差",
				influenceDirection: "forward",
				influenceLevel: "high",
			},
		],
		importance: "major",
		displayNames: ["成長物語"],
		relations: {
			characters: ["cinderella"],
			settings: ["mansion"],
		},
	};`

	got, err := entity.LoadSubplot(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadSubplot: %v", err)
	}
	if got.ID != "growth" || got.Type != "subplot" || got.Status != "active" {
		t.Errorf("got = %+v", got)
	}
	if len(got.Beats) != 1 || got.Beats[0].StructurePosition != "setup" {
		t.Errorf("Beats = %+v", got.Beats)
	}
	if got.FocusCharacters["cinderella"] != "primary" {
		t.Errorf("FocusCharacters[cinderella] = %q", got.FocusCharacters["cinderella"])
	}
	if len(got.Intersections) != 1 {
		t.Fatalf("Intersections = %d, want 1", len(got.Intersections))
	}
	inter := got.Intersections[0]
	if inter.InfluenceDirection != "forward" {
		t.Errorf("InfluenceDirection = %q", inter.InfluenceDirection)
	}
	if inter.InfluenceLevel == nil || *inter.InfluenceLevel != "high" {
		t.Errorf("InfluenceLevel = %v", inter.InfluenceLevel)
	}
	if got.Importance == nil || *got.Importance != "major" {
		t.Errorf("Importance = %v", got.Importance)
	}
}

func TestLoadCharacterPhase_minimal(t *testing.T) {
	src := `export const phase1 = {
		id: "phase_awakening",
		name: "覚醒",
		order: 1,
		summary: "魔法に出会う",
		delta: {
			summary: "新たな世界を知る",
			traits: { add: ["勇敢"], remove: ["臆病"] },
		},
		transitionType: "turning_point",
		importance: "major",
		startChapter: "chapter_02",
		displayNames: ["覚醒期"],
	};`

	got, err := entity.LoadCharacterPhase(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadCharacterPhase: %v", err)
	}
	if got.ID != "phase_awakening" || got.Order != 1 {
		t.Errorf("got = %+v", got)
	}
	if got.Delta.Summary != "新たな世界を知る" {
		t.Errorf("Delta.Summary = %q", got.Delta.Summary)
	}
	if got.Delta.Traits == nil || len(got.Delta.Traits.Add) != 1 || got.Delta.Traits.Add[0] != "勇敢" {
		t.Errorf("Delta.Traits.Add = %+v", got.Delta.Traits)
	}
	if got.TransitionType == nil || *got.TransitionType != "turning_point" {
		t.Errorf("TransitionType = %v", got.TransitionType)
	}
	if got.StartChapter == nil || *got.StartChapter != "chapter_02" {
		t.Errorf("StartChapter = %v", got.StartChapter)
	}
}

func TestLoadCharacter_unknownFieldsIgnored(t *testing.T) {
	src := `export const c = {
		id: "c", name: "C", role: "supporting",
		traits: [], relationships: {}, appearingChapters: [], summary: "s",
		futureField: "ignored",
		anotherFuture: { nested: 42 },
	};`
	got, err := entity.LoadCharacter(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadCharacter: %v", err)
	}
	if got.ID != "c" {
		t.Errorf("ID = %q", got.ID)
	}
}
