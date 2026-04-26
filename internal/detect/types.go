// Package detect provides entity reference detection and confidence scoring
// for storyteller manuscripts. Shared types are defined here so both
// internal/meta (frontmatter) and internal/detect (reference) can depend
// on the same contract without circular import.
package detect

// Position は LSP-互換の文書位置 (UTF-16 code unit ベース)。
// Line は 0 起点。Character は UTF-16 code unit offset。
type Position struct {
	Line      int // 0-based
	Character int // 0-based, UTF-16 code unit
}

// RangeUTF16 は Position 範囲。
type RangeUTF16 struct {
	Start Position
	End   Position
}

// SourceLocation は manuscript 内の検出位置。
type SourceLocation struct {
	URI   string // file:// URI
	Range RangeUTF16
}

// EntityKind は検出対象 entity 分類。
type EntityKind string

const (
	EntityCharacter     EntityKind = "character"
	EntitySetting       EntityKind = "setting"
	EntityForeshadowing EntityKind = "foreshadowing"
	EntityTimelineEvent EntityKind = "timeline_event"
	EntityPhase         EntityKind = "phase"
	EntityTimeline      EntityKind = "timeline"
)

// EntityRef は ID と種別による参照。
type EntityRef struct {
	Kind EntityKind
	ID   string
}

// MatchSource は confidence 計算で名前マッチがどの属性由来かを示す。
type MatchSource string

const (
	SourceName          MatchSource = "name"           // 1.0
	SourceDisplayName   MatchSource = "display_name"   // 0.9
	SourceAlias         MatchSource = "alias"          // 0.8
	SourcePronoun       MatchSource = "pronoun"        // 0.6
	SourceDetectionHint MatchSource = "detection_hint" // custom
	SourceFrontMatter   MatchSource = "frontmatter"    // 1.0 (explicit binding)
)

// ConfidenceCandidate は entity 1 件の検出候補。
type ConfidenceCandidate struct {
	Entity      EntityRef
	Source      MatchSource
	Score       float64 // 0.0-1.0
	Location    SourceLocation
	MatchedText string
	ExcludedBy  []string // exclude rules がマッチしたら何が原因かを残す
}

// EntityCatalog は名前/ID から entity を引くための抽象 interface。
// internal/project/store の adapter として実装する。
type EntityCatalog interface {
	// FindByID は ID で完全一致検索。
	FindByID(kind EntityKind, id string) (EntityRef, bool)
	// FindByName は name / displayNames / aliases / pronouns を順に検索。
	// 第二戻り値はマッチ元の MatchSource。
	FindByName(name string) (EntityRef, MatchSource, bool)
	// ListNames は kind 配下の全 name + displayNames + aliases を返す
	// (longest-match のための pre-scan 用)。
	ListNames(kind EntityKind) []string
}
