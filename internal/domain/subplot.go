package domain

// This file bundles Subplot, PlotBeat, PlotIntersection and SubplotRelations.
// All four types share the same conceptual cluster (a subplot is composed of
// beats and connected to other subplots through intersections), so co-locating
// them keeps the cross-references local and avoids exposing intermediate
// helpers.
//
// Why: Adopt string-typed const enums (e.g. `type SubplotType string`) instead
// of int-iota. Reasons:
//   - JSON round-trip with src/type/v2/subplot.ts uses literal strings as the
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

// SubplotType classifies a plot line by narrative role.
//
// TS source: `"main" | "subplot" | "parallel" | "background"`
// (src/type/v2/subplot.ts).
type SubplotType string

const (
	SubplotTypeMain       SubplotType = "main"
	SubplotTypeSubplot    SubplotType = "subplot"
	SubplotTypeParallel   SubplotType = "parallel"
	SubplotTypeBackground SubplotType = "background"
)

// SubplotStatus tracks lifecycle progression of a subplot.
type SubplotStatus string

const (
	SubplotStatusActive    SubplotStatus = "active"
	SubplotStatusCompleted SubplotStatus = "completed"
)

// SubplotImportance flags how central a subplot is to the overall story.
type SubplotImportance string

const (
	SubplotImportanceMajor SubplotImportance = "major"
	SubplotImportanceMinor SubplotImportance = "minor"
)

// FocusCharacterPriority records how strongly a character drives a subplot.
//
// TS source: `Record<string, "primary" | "secondary">` on Subplot.focusCharacters.
type FocusCharacterPriority string

const (
	FocusCharacterPriorityPrimary   FocusCharacterPriority = "primary"
	FocusCharacterPrioritySecondary FocusCharacterPriority = "secondary"
)

// StructurePosition labels where a beat sits in the narrative arc.
//
// TS source: BeatStructurePosition in src/type/v2/subplot.ts.
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

// PlotBeat is one narrative beat inside a Subplot. Beats are also the
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

// PlotIntersection links a beat in one subplot to a beat in another, modelling
// how plotlines influence each other.
type PlotIntersection struct {
	// Required identity & link surface.
	ID                 string
	SourceSubplotID    string
	SourceBeatID       string
	TargetSubplotID    string
	TargetBeatID       string
	Summary            string
	InfluenceDirection InfluenceDirection

	// Optional grading.
	InfluenceLevel *InfluenceLevel
}

// SubplotDetails carries optional long-form descriptive fields. Each field
// uses the shared StringOrFileRef union (see file header comment).
type SubplotDetails struct {
	Description StringOrFileRef
	Theme       StringOrFileRef
	Notes       StringOrFileRef
}

// SubplotRelations records cross-entity ID references owned by a Subplot.
// Characters/Settings are required (always present, possibly empty); the rest
// are optional and default to nil.
type SubplotRelations struct {
	Characters      []string
	Settings        []string
	Foreshadowings  []string // optional (nil = absent)
	RelatedSubplots []string // optional
}

// Subplot is a single plot line composed of ordered beats and connected to
// other subplots through intersections.
type Subplot struct {
	// Required identity & metadata
	ID      string
	Name    string
	Type    SubplotType
	Status  SubplotStatus
	Summary string
	Beats   []PlotBeat

	// Optional structural information
	FocusCharacters map[string]FocusCharacterPriority // nil = absent
	Intersections   []PlotIntersection                // nil = absent
	Importance      *SubplotImportance                // nil = absent
	ParentSubplotID *string                           // nil = top-level
	DisplayNames    []string                          // nil = absent
	Details         *SubplotDetails                   // nil = absent
	Relations       *SubplotRelations                 // nil = absent
}
