package domain

// BaseCharacterRef は CharacterStateSnapshot 内で参照される基本キャラクター情報。
//
// Why: TS の inline object `{ id; name; role }` を Go では名前付き struct に格上げ。
// 匿名 struct のままだと 2 箇所以上で再利用できないため。
type BaseCharacterRef struct {
	ID   string
	Name string
	Role CharacterRole
}

// CharacterStateSnapshot は特定のフェーズにおける完全な状態スナップショット。
//
// TS source: src/type/v2/character_state.ts:CharacterStateSnapshot
type CharacterStateSnapshot struct {
	CharacterID string
	// PhaseID は初期状態を表すために null 許容（TS: string | null）。
	// Go では *string=nil で「初期状態」を表現する。
	PhaseID    *string
	PhaseName  string
	ResolvedAt string

	Traits        []string
	Beliefs       []string
	Abilities     []string
	Relationships map[string]RelationType
	Appearance    []string
	Status        StatusDelta
	Goals         []string
	Summary       string

	BaseCharacter BaseCharacterRef
}

// StringDiff は文字列スライスの追加・削除差分。
type StringDiff struct {
	Added   []string
	Removed []string
}

// RelationChange は単一の関係性遷移を表す。
type RelationChange struct {
	From RelationType
	To   RelationType
}

// RelationshipsDiff は関係性差分の集計結果。
type RelationshipsDiff struct {
	Added   map[string]RelationType
	Removed []string
	Changed map[string]RelationChange
}

// StringFromTo は単一フィールドの旧値→新値遷移を表す。
// From/To とも optional（pointer or nil）。
type StringFromTo struct {
	From *string
	To   *string
}

// StatusDiff は status 各サブフィールドの差分。
type StatusDiff struct {
	Physical *StringFromTo
	Mental   *StringFromTo
	Social   *StringFromTo
}

// PhaseDiffChanges は PhaseDiffResult.changes に対応する差分集合。
type PhaseDiffChanges struct {
	Traits        StringDiff
	Beliefs       StringDiff
	Abilities     StringDiff
	Relationships RelationshipsDiff
	Appearance    StringDiff
	Status        StatusDiff
	Goals         StringDiff
	// Summary は変化があった場合のみ非 nil。
	Summary *StringFromTo
}

// PhaseDiffResult は 2 つのフェーズ間の差分比較結果。
//
// TS source: src/type/v2/character_state.ts:PhaseDiffResult
type PhaseDiffResult struct {
	// FromPhaseID は初期状態起点の場合 nil。
	FromPhaseID   *string
	ToPhaseID     string
	FromPhaseName string
	ToPhaseName   string
	Changes       PhaseDiffChanges
}

// PhaseTimelineEntry はフェーズタイムライン表示用のエントリ。
//
// TS source: src/type/v2/character_state.ts:PhaseTimelineEntry
type PhaseTimelineEntry struct {
	// PhaseID は初期状態を表す場合 nil。
	PhaseID        *string
	PhaseName      string
	Order          int
	Summary        string
	TransitionType *string
	Importance     *string
	StartChapter   *string
	TriggerEventID *string
	KeyChanges     []string
}
