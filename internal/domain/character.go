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
//
// ArcNotes は TS の `string | { file: string }` を共通 StringOrFileRef で表現する
// (Wave-A2-pre で集約)。
type CharacterDevelopment struct {
	Initial    string
	Goal       string
	Obstacle   string
	Resolution *string
	ArcNotes   StringOrFileRef
}

// CharacterDetails は段階的詳細化のためのオプショナル詳細情報。
//
// 各 string|FileRef union は共通 StringOrFileRef で表現する。
// Value/File のいずれか一方のみが空文字以外になる運用 (zero value = 未設定)。
type CharacterDetails struct {
	Description         StringOrFileRef
	Appearance          StringOrFileRef
	Personality         StringOrFileRef
	Backstory           StringOrFileRef
	RelationshipsDetail StringOrFileRef
	Goals               StringOrFileRef
	Development         *CharacterDevelopment
}

// CharacterDetectionHints は LSP 用の検出ヒント (Character entity 向け)。
//
// Why: Wave-A2-pre で entity 横断の per-entity 命名に揃える方針を採択。共通名
// `DetectionHints` は廃止し、各 entity が独自の `<Entity>DetectionHints` 型を
// 持つ (Setting / Timeline / TimelineEvent と同形式)。
type CharacterDetectionHints struct {
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
	DetectionHints *CharacterDetectionHints

	// 成長・変化表現フィールド
	InitialState   *CharacterInitialState
	Phases         []CharacterPhase
	CurrentPhaseID *string
}
