package domain

// Foreshadowing models a narrative foreshadowing: a planted hint or device
// whose resolution (or abandonment) is tracked across chapters.
//
// Why: Adopted string-typed const enums instead of int iota — preserves the
// wire format already used by the TypeScript source of truth (literal unions
// like "planted"|"resolved") so JSON/YAML round-trip stays identical and no
// custom (Un)Marshaler is needed during the Go migration.
//
// Why: Adopted pointer fields for optional scalars instead of zero-value
// sentinels — distinguishes "unset" from "explicitly empty/zero" (e.g.
// `PlannedResolutionChapter == nil` vs. `*PlannedResolutionChapter == ""`).
//
// Why: Adopted nil-slice convention for optional collections instead of
// always-allocated empty slices — keeps zero values cheap and aligns with the
// optional `?` semantics of the TypeScript definition.
type Foreshadowing struct {
	// Required metadata.
	ID       string
	Name     string
	Type     ForeshadowingType
	Summary  string
	Planting PlantingInfo
	Status   ForeshadowingStatus

	// Optional fields. Pointers (or nil slices/maps) signal "unset".
	Importance               *ForeshadowingImportance
	Resolutions              []ResolutionInfo
	PlannedResolutionChapter *string
	Relations                *ForeshadowingRelations
	DisplayNames             []string
}

// ForeshadowingStatus enumerates the lifecycle states of a foreshadowing.
type ForeshadowingStatus string

const (
	ForeshadowingStatusPlanted            ForeshadowingStatus = "planted"
	ForeshadowingStatusPartiallyResolved  ForeshadowingStatus = "partially_resolved"
	ForeshadowingStatusResolved           ForeshadowingStatus = "resolved"
	ForeshadowingStatusAbandoned          ForeshadowingStatus = "abandoned"
)

// ForeshadowingType enumerates the narrative category of a foreshadowing.
type ForeshadowingType string

const (
	ForeshadowingTypeHint       ForeshadowingType = "hint"
	ForeshadowingTypeProphecy   ForeshadowingType = "prophecy"
	ForeshadowingTypeMystery    ForeshadowingType = "mystery"
	ForeshadowingTypeSymbol     ForeshadowingType = "symbol"
	ForeshadowingTypeChekhov    ForeshadowingType = "chekhov"
	ForeshadowingTypeRedHerring ForeshadowingType = "red_herring"
)

// ForeshadowingImportance enumerates the narrative weight of a foreshadowing.
type ForeshadowingImportance string

const (
	ForeshadowingImportanceMajor  ForeshadowingImportance = "major"
	ForeshadowingImportanceMinor  ForeshadowingImportance = "minor"
	ForeshadowingImportanceSubtle ForeshadowingImportance = "subtle"
)

// PlantingInfo describes where and how a foreshadowing was planted.
//
// Excerpt uses the shared StringOrFileRef helper (Wave-A2-pre集約)。nil = excerpt
// 未設定; non-nil pointer の Value/File 一方が非空。
type PlantingInfo struct {
	Chapter     string
	Description string
	Excerpt     *StringOrFileRef
	EventID     *string
}

// ResolutionInfo describes a (possibly partial) resolution of a foreshadowing.
//
// Why: Adopted float64 for Completeness instead of an int percentage — mirrors
// the TS `number` (0.0–1.0) representation and avoids a lossy unit conversion.
type ResolutionInfo struct {
	Chapter      string
	Description  string
	Excerpt      *StringOrFileRef
	EventID      *string
	Completeness float64
}

// ForeshadowingRelations groups cross-entity references by ID.
//
// Why: Adopted plain []string ID lists instead of pointer-to-entity references
// — keeps internal/domain free of inter-struct coupling and makes
// serialization symmetric with the TS source.
type ForeshadowingRelations struct {
	Characters            []string
	Settings              []string
	RelatedForeshadowings []string
}
