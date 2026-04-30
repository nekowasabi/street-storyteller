package domain

// This file bundles Plot, PlotBeat, PlotIntersection and PlotRelations.
// All four types share the same conceptual cluster (a plot is composed of
// beats and connected to other plots through intersections), so co-locating
// them keeps the cross-references local and avoids exposing intermediate
// helpers.
//
// Why: Adopt string-typed const enums (e.g. `type PlotType string`) instead
// of int-iota. Reasons:
//   - JSON round-trip with src/type/v2/plot.ts uses literal strings as the
//     source of truth; matching the wire representation by value avoids a
//     translation table on every marshal/unmarshal.
//   - Mission spec (WT-A1-5) explicitly mandates this representation.
//   - Other domain bundles (foreshadowing/timeline) may use iota; the
//     entity-type-mapping doc allows divergence per-bundle.
//
// Why: `string | { file: string }` unions in TS map to the shared
// StringOrFileRef helper (`internal/domain/common.go`). Wave-A2-pre で集約済み:
// 旧 inline anonymous struct (Inline/FileRef) は撤去し、Character / Setting /
// Foreshadowing / Timeline と同じ型で統一する。

// PlotType classifies a plot line by narrative role.
//
// TS source: `"main" | "sub" | "parallel" | "background"`
// (src/type/v2/plot.ts).
type PlotType string

const (
	PlotTypeMain       PlotType = "main"
	PlotTypeSub        PlotType = "sub"
	PlotTypeParallel   PlotType = "parallel"
	PlotTypeBackground PlotType = "background"
)

func IsValidPlotType(v PlotType) bool {
	switch v {
	case PlotTypeMain, PlotTypeSub, PlotTypeParallel, PlotTypeBackground:
		return true
	default:
		return false
	}
}

// PlotStatus tracks lifecycle progression of a plot.
type PlotStatus string

const (
	PlotStatusActive    PlotStatus = "active"
	PlotStatusCompleted PlotStatus = "completed"
)

// PlotImportance flags how central a plot is to the overall story.
type PlotImportance string

const (
	PlotImportanceMajor PlotImportance = "major"
	PlotImportanceMinor PlotImportance = "minor"
)

// FocusCharacterPriority records how strongly a character drives a plot.
//
// TS source: `Record<string, "primary" | "secondary">` on Plot.focusCharacters.
type FocusCharacterPriority string

const (
	FocusCharacterPriorityPrimary   FocusCharacterPriority = "primary"
	FocusCharacterPrioritySecondary FocusCharacterPriority = "secondary"
)

// StructurePosition labels where a beat sits in the narrative arc.
//
// TS source: BeatStructurePosition in src/type/v2/plot.ts.
// Five-stage arc (setup, rising, climax, falling, resolution).
type StructurePosition string

const (
	StructurePositionSetup      StructurePosition = "setup"
	StructurePositionRising     StructurePosition = "rising"
	StructurePositionClimax     StructurePosition = "climax"
	StructurePositionFalling    StructurePosition = "falling"
	StructurePositionResolution StructurePosition = "resolution"
)

// InfluenceDirection states how influence flows across a PlotIntersection.
//
// TS source: IntersectionInfluenceDirection (forward/backward/mutual).
type InfluenceDirection string

const (
	InfluenceDirectionForward  InfluenceDirection = "forward"
	InfluenceDirectionBackward InfluenceDirection = "backward"
	InfluenceDirectionMutual   InfluenceDirection = "mutual"
)

// InfluenceLevel grades the strength of a PlotIntersection.
type InfluenceLevel string

const (
	InfluenceLevelHigh   InfluenceLevel = "high"
	InfluenceLevelMedium InfluenceLevel = "medium"
	InfluenceLevelLow    InfluenceLevel = "low"
)

// PlotBeat is one narrative beat inside a Plot. Beats are also the
// connection points referenced by PlotIntersection.
type PlotBeat struct {
	// Required identity & content
	ID                string
	Title             string
	Summary           string
	StructurePosition StructurePosition

	// Optional cross-entity references. Pointers for scalar optionals,
	// nil slices for absent collections (TS `field?: string[]`).
	Chapter             *string
	Characters          []string
	Settings            []string
	TimelineEventID     *string
	PreconditionBeatIDs []string
}

// PlotIntersection links a beat in one plot to a beat in another, modelling
// how plotlines influence each other.
type PlotIntersection struct {
	// Required identity & link surface.
	ID                 string
	SourcePlotID       string
	SourceBeatID       string
	TargetPlotID       string
	TargetBeatID       string
	Summary            string
	InfluenceDirection InfluenceDirection

	// Optional grading.
	InfluenceLevel *InfluenceLevel
}

// PlotDetails carries optional long-form descriptive fields. Each field
// uses the shared StringOrFileRef union (see file header comment).
type PlotDetails struct {
	Description StringOrFileRef
	Theme       StringOrFileRef
	Notes       StringOrFileRef
}

// PlotRelations records cross-entity ID references owned by a Plot.
// Characters/Settings are required (always present, possibly empty); the rest
// are optional and default to nil.
type PlotRelations struct {
	Characters     []string
	Settings       []string
	Foreshadowings []string // optional (nil = absent)
	RelatedPlots   []string // optional
}

// Plot is a single plot line composed of ordered beats and connected to
// other plots through intersections.
type Plot struct {
	// Required identity & metadata
	ID      string
	Name    string
	Type    PlotType
	Status  PlotStatus
	Summary string
	Beats   []PlotBeat

	// Optional structural information
	FocusCharacters map[string]FocusCharacterPriority // nil = absent
	Intersections   []PlotIntersection                // nil = absent
	Importance      *PlotImportance                   // nil = absent
	ParentPlotID    *string                           // nil = top-level
	DisplayNames    []string                          // nil = absent
	Details         *PlotDetails                      // nil = absent
	Relations       *PlotRelations                    // nil = absent
}
