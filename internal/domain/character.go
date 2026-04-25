package domain

// CharacterRole はキャラクターの役割を表す。
//
// Why: TS の `"protagonist" | "antagonist" | ...` リテラル union を Go では
// `type CharacterRole string` + 定数で表現する。iota int 化ではなく文字列定数
// にしているのは、JSON/YAML との互換性と既存 TS データ資産との往復翻訳を
// 単純に保つため。
type CharacterRole string

const (
	RoleProtagonist CharacterRole = "protagonist"
	RoleAntagonist  CharacterRole = "antagonist"
	RoleSupporting  CharacterRole = "supporting"
	RoleGuest       CharacterRole = "guest"
)

// RelationType はキャラクター間の関係性の種類を表す。
type RelationType string

const (
	RelationAlly        RelationType = "ally"
	RelationEnemy       RelationType = "enemy"
	RelationNeutral     RelationType = "neutral"
	RelationRomantic    RelationType = "romantic"
	RelationRespect     RelationType = "respect"
	RelationCompetitive RelationType = "competitive"
	RelationMentor      RelationType = "mentor"
)

// CharacterDevelopment はキャラクターの成長・発展を表す。
type CharacterDevelopment struct {
	Initial    string
	Goal       string
	Obstacle   string
	Resolution *string
	// ArcNotes は arc_notes (TS では string | { file: string }) に対応。
	// Why: Wave-A1 では共通 StringOrFileRef 型を導入せず inline anonymous struct で
	// 自己完結。Wave-A2 で集約予定。
	ArcNotes struct {
		Value string
		File  string
	}
}

// CharacterDetails は段階的詳細化のためのオプショナル詳細情報。
//
// 各 string|FileRef union は inline anonymous struct で表現する。
// Value/File のいずれか一方のみが空文字以外になる運用。
type CharacterDetails struct {
	Description struct {
		Value string
		File  string
	}
	Appearance struct {
		Value string
		File  string
	}
	Personality struct {
		Value string
		File  string
	}
	Backstory struct {
		Value string
		File  string
	}
	RelationshipsDetail struct {
		Value string
		File  string
	}
	Goals struct {
		Value string
		File  string
	}
	Development *CharacterDevelopment
}

// DetectionHints は LSP 用の検出ヒント。
type DetectionHints struct {
	CommonPatterns  []string
	ExcludePatterns []string
	Confidence      float64
}

// Character は物語のキャラクターを表す中核エンティティ。
//
// TS source: src/type/v2/character.ts:Character
type Character struct {
	// 必須メタデータ
	ID                string
	Name              string
	Role              CharacterRole
	Traits            []string
	Relationships     map[string]RelationType
	AppearingChapters []string
	Summary           string

	// オプショナル情報
	DisplayNames   []string
	Aliases        []string
	Pronouns       []string
	Details        *CharacterDetails
	DetectionHints *DetectionHints

	// 成長・変化表現フィールド
	InitialState   *CharacterInitialState
	Phases         []CharacterPhase
	CurrentPhaseID *string
}
