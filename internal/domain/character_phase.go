package domain

// PhaseImportance はフェーズの重要度を表す。
type PhaseImportance string

const (
	PhaseImportanceMajor  PhaseImportance = "major"
	PhaseImportanceMinor  PhaseImportance = "minor"
	PhaseImportanceSubtle PhaseImportance = "subtle"
)

// TransitionType はフェーズ間遷移のタイプを表す。
type TransitionType string

const (
	TransitionGradual        TransitionType = "gradual"
	TransitionTurningPoint   TransitionType = "turning_point"
	TransitionRevelation     TransitionType = "revelation"
	TransitionRegression     TransitionType = "regression"
	TransitionTransformation TransitionType = "transformation"
)

// ArrayDelta は配列属性の差分。
type ArrayDelta struct {
	Add    []string
	Remove []string
	Modify map[string]string
}

// AbilitiesDelta は能力・スキルの差分。
type AbilitiesDelta struct {
	Add     []string
	Remove  []string
	Improve []string
	Degrade []string
}

// RelationshipsDelta は関係性の差分。
type RelationshipsDelta struct {
	Add    map[string]RelationType
	Remove []string
	Change map[string]RelationType
}

// StatusDelta は身体・精神・社会的状態の差分。
type StatusDelta struct {
	Physical string
	Mental   string
	Social   string
}

// CharacterStateDelta はフェーズ間で変化する属性の差分。
//
// すべてのフィールドが optional（pointer or nil-slice/map）。
// 指定されていないフィールドは「前フェーズから継承」を意味する。
type CharacterStateDelta struct {
	Traits        *ArrayDelta
	Beliefs       *ArrayDelta
	Abilities     *AbilitiesDelta
	Relationships *RelationshipsDelta
	Appearance    *ArrayDelta
	Status        *StatusDelta
	Goals         *ArrayDelta
	Summary       string
}

// PhaseDetails はフェーズの詳細情報。
// 各フィールドは共通 StringOrFileRef で string|FileRef union を表現する
// (Wave-A2-pre で集約)。
type PhaseDetails struct {
	Description    StringOrFileRef
	InternalChange StringOrFileRef
	ExternalChange StringOrFileRef
	Catalyst       StringOrFileRef
	Notes          StringOrFileRef
}

// CharacterPhase はキャラクターの成長段階を表す。
//
// TS source: src/type/v2/character_phase.ts:CharacterPhase
type CharacterPhase struct {
	// 必須メタデータ
	ID      string
	Name    string
	Order   int
	Summary string
	Delta   CharacterStateDelta

	// オプショナル情報
	TransitionType *TransitionType
	Importance     *PhaseImportance
	TriggerEventID *string
	TimelineID     *string
	StartChapter   *string
	EndChapter     *string
	Details        *PhaseDetails
	DisplayNames   []string
}

// CharacterInitialState は差分計算のベースラインとなる初期状態。
type CharacterInitialState struct {
	Traits        []string
	Beliefs       []string
	Abilities     []string
	Relationships map[string]RelationType
	Appearance    []string
	Status        *StatusDelta
	Goals         []string
}
