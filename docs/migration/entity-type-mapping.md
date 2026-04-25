# TypeScript Entity Types → Go Struct Mapping

マイグレーション時の 1:1 型対応ガイド。各 TypeScript 型の Go 実装では、フィールド差異（optional field の扱い、union 型の string-typed const enum 化、ファイル参照の解決方式）を明示する。

## Wave-A1 / Wave-A2-pre 採決事項（共通規約）

各 entity bundle に展開する前に、Wave-A1 全 worktree が共通採用した規約をここに集約する。

### Enum 表現: **string-typed const enum**（採用）

```go
type CharacterRole string

const (
    RoleProtagonist CharacterRole = "protagonist"
    RoleAntagonist  CharacterRole = "antagonist"
    // ...
)
```

- **Why**: TS の literal union (`"protagonist" | "antagonist" | ...`) と JSON/YAML wire format を 1:1 に保つ。
- **Why**: ログやデバッグ出力で値が人間可読 (`"protagonist"` vs `2`)。
- **Why**: カスタム `MarshalJSON` / `UnmarshalJSON` 実装が不要。

#### Rejected: `iota int` 案

旧版ドキュメント（〜Wave-A1 着手前）には `type CharacterRole int` + `iota` を推奨する記述があった。Wave-A1 全 worktree（character / setting / foreshadowing / timeline / subplot 担当）はこの方針を **明示的に override** し、上記 string-typed const に統一した。

- **Rejection rationale**: JSON wire format compatibility, debug log readability, no custom marshaller.
- 旧 iota 案は Wave-A1 で全廃。本ドキュメントは現実装（string-typed）を真とする。

### Union 型 `string | { file: string }`: **`StringOrFileRef` 共通型**（Wave-A2-pre で集約）

```go
// internal/domain/common.go
type StringOrFileRef struct {
    Value string
    File  string
}

func (s StringOrFileRef) IsFile() bool { return s.File != "" }
func (s StringOrFileRef) IsEmpty() bool { return s.Value == "" && s.File == "" }
```

- **Why**: TS の `string | { file: string }` を pointer ペア (`*string` + `*FileRef`) より排他フィールドの struct で表現するほうが zero value（inline 空）として自然で、JSON unmarshaler 拡張時の分岐も単純化される。
- **使用場所**: Character / CharacterPhase / Setting / Foreshadowing / Timeline / TimelineEvent / Subplot の details / excerpt / arc_notes 各フィールド。
- **ポインタ運用**:
  - 「未設定」を区別する箇所 → `*StringOrFileRef`（nil = 未設定）。例: `SettingDetails.Description`, `PlantingInfo.Excerpt`, `TimelineDetails.Background`。
  - 常に値として持つ箇所 → `StringOrFileRef`（zero = `IsEmpty()`）。例: `CharacterDetails.Description`, `SubplotDetails.Description`, `PhaseDetails.*`, `CharacterDevelopment.ArcNotes`。

#### Wave-A1 で個別に出現していた旧型（**Wave-A2-pre で集約**）

| Worktree | 旧表現 | 集約後 |
|----------|--------|--------|
| Character / CharacterPhase | inline anonymous `struct { Value string; File string }` | `StringOrFileRef`（値 or `*StringOrFileRef`） |
| Setting | inline anonymous pointer `*struct { Value string; File string }` | `*StringOrFileRef` |
| Foreshadowing | named tagged union `*ExcerptValue { Text *string; FileRef *FileRef }` + `FileRef { File string }` | `*StringOrFileRef` |
| Timeline / TimelineEvent | named `TextOrFileRef { Text string; File string }` | `*StringOrFileRef` |
| Subplot | inline anonymous `struct { Inline string; FileRef *string }` | `StringOrFileRef` |

旧型 (`ExcerptValue`, `FileRef`, `TextOrFileRef`, anonymous variants) はすべて削除済み。

### DetectionHints: **per-entity 命名で固定**

LSP 検出ヒント struct は entity ごとに専用型を定義する。共通名 `DetectionHints` は廃止。

| Entity | 型名 |
|--------|------|
| Character | `CharacterDetectionHints` |
| Setting | `SettingDetectionHints` |
| Timeline | `TimelineDetectionHints` |
| TimelineEvent | `TimelineEventDetectionHints` |
| Foreshadowing | （現状 detection hint は未実装。追加時は `ForeshadowingDetectionHints`） |
| Subplot | （現状未実装。追加時は `SubplotDetectionHints`） |

- **Why**: 共有型にすると、entity 固有のフィールド追加（例: confidence の閾値の差）が他 entity を巻き込む。per-entity prefixed name で疎結合に保つ。

### Optional Field の扱い: **pointer / nil-slice / nil-map convention**

- 単純スカラー optional → `*T`（nil = 未設定、`*T == zero` と区別）。
- コレクション optional → `nil` slice / `nil` map（zero value = 未設定）。
- ネスト struct optional → `*S`（nil = 未設定）。

旧版ドキュメントの "presence field (`HasAliases bool` + `Aliases []string`)" 案は採用しない。

---

## Character

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Character` | `src/type/v2/character.ts:95` | `internal/domain/character.go:Character` | 中核エンティティ |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | 識別子キー |
| `name: string` | `Name string` | 直接 | 表示名 |
| `role: "protagonist" \| "antagonist" \| ...` | `Role CharacterRole` | string-typed const enum | Wave-A1 採決 |
| `traits: string[]` | `Traits []string` | 直接 | スライス |
| `relationships: { [key: string]: RelationType }` | `Relationships map[string]RelationType` | 直接 | map 化 |
| `appearingChapters: string[]` | `AppearingChapters []string` | 直接 | |
| `summary: string` | `Summary string` | 直接 | |
| `displayNames?: string[]` | `DisplayNames []string` | nil-slice convention | optional → nil で表現 |
| `aliases?: string[]` | `Aliases []string` | nil-slice convention | |
| `pronouns?: string[]` | `Pronouns []string` | nil-slice convention | |
| `details?: { ... }` | `Details *CharacterDetails` | pointer or nil | nested struct |
| `detectionHints?: { ... }` | `DetectionHints *CharacterDetectionHints` | pointer or nil | per-entity 命名 |
| `phases?: CharacterPhase[]` | `Phases []CharacterPhase` | nil-slice convention | |

### CharacterDetails

各フィールドは `StringOrFileRef`（値）。zero value = 未設定。

| TypeScript | Go |
|------------|----|
| `description?: string \| { file: string }` | `Description StringOrFileRef` |
| `appearance?` | `Appearance StringOrFileRef` |
| `personality?` | `Personality StringOrFileRef` |
| `backstory?` | `Backstory StringOrFileRef` |
| `relationshipsDetail?` | `RelationshipsDetail StringOrFileRef` |
| `goals?` | `Goals StringOrFileRef` |
| `development?` | `Development *CharacterDevelopment` |

`CharacterDevelopment.ArcNotes` も `StringOrFileRef`（値）。

---

## CharacterPhase

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `CharacterPhase` | `src/type/v2/character_phase.ts` | `internal/domain/character_phase.go:CharacterPhase` | 差分適用方式 |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | |
| `order: number` | `Order int` | 直接 | |
| `summary: string` | `Summary string` | 直接 | |
| `delta: CharacterStateDelta` | `Delta CharacterStateDelta` | 値 | 差分本体 |
| `transitionType?` | `TransitionType *TransitionType` | pointer enum | string-typed const |
| `importance?` | `Importance *PhaseImportance` | pointer enum | |
| `triggerEventId?` | `TriggerEventID *string` | pointer | |
| `details?: PhaseDetails` | `Details *PhaseDetails` | pointer or nil | nested |

`PhaseDetails` の各 union フィールド (`description`, `internalChange`, `externalChange`, `catalyst`, `notes`) は `StringOrFileRef`（値）。

---

## CharacterState（Snapshot / Diff / TimelineEntry）

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `CharacterStateSnapshot` | `src/type/v2/character_state.ts` | `internal/domain/character_state.go:CharacterStateSnapshot` | フェーズ確定スナップショット |
| `PhaseDiffResult` | 同 | `PhaseDiffResult` | 2 フェーズ間の差分 |
| `PhaseTimelineEntry` | 同 | `PhaseTimelineEntry` | UI タイムラインエントリ |

差分・遷移系 helper（`StringDiff`, `RelationshipsDiff`, `StringFromTo`, `StatusDiff`, `PhaseDiffChanges`）はすべて plain struct で `internal/domain/character_state.go` に定義。union 型は使わない。

---

## Setting

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Setting` | `src/type/v2/setting.ts:58` | `internal/domain/setting.go:Setting` | 世界観・設定エンティティ |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | |
| `type: "location" \| "world" \| "culture" \| "organization"` | `Type SettingType` | string-typed const enum | Wave-A1 採決 |
| `appearingChapters: string[]` | `AppearingChapters []string` | 直接 | |
| `summary: string` | `Summary string` | 直接 | |
| `displayNames?` | `DisplayNames []string` | nil-slice | |
| `details?: SettingDetails` | `Details *SettingDetails` | pointer or nil | |
| `relatedSettings?` | `RelatedSettings []string` | nil-slice | |
| `detectionHints?` | `DetectionHints *SettingDetectionHints` | pointer or nil | per-entity 命名 |

### SettingDetails

各フィールドは `*StringOrFileRef`（nil = 未設定、`&{Value: "..."}` = inline、`&{File: "..."}` = file ref）。

| TS field | Go field |
|----------|----------|
| `description?` | `Description *StringOrFileRef` |
| `geography?` | `Geography *StringOrFileRef` |
| `history?` | `History *StringOrFileRef` |
| `culture?` | `Culture *StringOrFileRef` |
| `politics?` | `Politics *StringOrFileRef` |
| `economy?` | `Economy *StringOrFileRef` |
| `inhabitants?` | `Inhabitants *StringOrFileRef` |
| `landmarks?` | `Landmarks *StringOrFileRef` |

---

## Foreshadowing

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Foreshadowing` | `src/type/v2/foreshadowing.ts:113` | `internal/domain/foreshadowing.go:Foreshadowing` | 伏線管理 |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | |
| `type: ForeshadowingType` | `Type ForeshadowingType` | string-typed const enum | |
| `summary: string` | `Summary string` | 直接 | |
| `planting: PlantingInfo` | `Planting PlantingInfo` | 値 | |
| `status: ForeshadowingStatus` | `Status ForeshadowingStatus` | string-typed const enum | |
| `importance?` | `Importance *ForeshadowingImportance` | pointer enum | |
| `resolutions?` | `Resolutions []ResolutionInfo` | nil-slice | |
| `plannedResolutionChapter?` | `PlannedResolutionChapter *string` | pointer | |
| `relations?` | `Relations *ForeshadowingRelations` | pointer | |
| `displayNames?` | `DisplayNames []string` | nil-slice | |

### Excerpt union（PlantingInfo / ResolutionInfo）

| TS field | Go field |
|----------|----------|
| `excerpt?: string \| { file: string }` | `Excerpt *StringOrFileRef` |

旧 `ExcerptValue { Text *string; FileRef *FileRef }` および `FileRef { File string }` は **Wave-A2-pre で削除**。

### Enum 一覧

- **ForeshadowingStatus**: `"planted" | "partially_resolved" | "resolved" | "abandoned"`
- **ForeshadowingType**: `"hint" | "prophecy" | "mystery" | "symbol" | "chekhov" | "red_herring"`
- **ForeshadowingImportance**: `"major" | "minor" | "subtle"`

---

## Timeline / TimelineEvent

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Timeline` | `src/type/v2/timeline.ts:92` | `internal/domain/timeline.go:Timeline` | 時系列管理 |
| `TimelineEvent` | 同 | `internal/domain/timeline.go:TimelineEvent` | イベント |

### Timeline フィールド対応

| TypeScript | Go | Notes |
|------------|----|-------|
| `scope: "story" \| ...` | `Scope TimelineScope` | string-typed const enum |
| `events: TimelineEvent[]` | `Events []TimelineEvent` | 値スライス |
| `parentTimeline?: string` | `ParentTimeline *string` | pointer |
| `childTimelines?: string[]` | `ChildTimelines []string` | nil-slice |
| `relatedCharacter?: string` | `RelatedCharacter *string` | pointer |
| `displayNames?` | `DisplayNames []string` | nil-slice |
| `displayOptions?` | `DisplayOptions *TimelineDisplayOptions` | pointer |
| `details?` | `Details *TimelineDetails` | pointer |
| `detectionHints?` | `DetectionHints *TimelineDetectionHints` | per-entity 命名 |

### TimelineEvent フィールド対応

| TypeScript | Go | Notes |
|------------|----|-------|
| `category: EventCategory` | `Category EventCategory` | string-typed const enum |
| `time: TimePoint` | `Time TimePoint` | 値 |
| `endTime?: TimePoint` | `EndTime *TimePoint` | pointer |
| `causedBy?: string[]` | `CausedBy []string` | nil-slice |
| `causes?: string[]` | `Causes []string` | nil-slice |
| `importance?` | `Importance *EventImportance` | pointer enum |
| `details?` | `Details *TimelineEventDetails` | pointer |
| `detectionHints?` | `DetectionHints *TimelineEventDetectionHints` | per-entity 命名 |
| `phaseChanges?` | `PhaseChanges []PhaseChangeInfo` | nil-slice |

### Union (`string | { file: string }`)

- `TimelineDetails.{Background, Notes}` → `*StringOrFileRef`
- `TimelineEventDetails.{Description, Impact, Notes}` → `*StringOrFileRef`

旧 `TextOrFileRef` 名は **Wave-A2-pre で削除**。

### Enum 一覧

- **TimelineScope**: `"story" | "world" | "character" | "arc"`
- **EventCategory**: `"plot_point" | "character_event" | "world_event" | "backstory" | "foreshadow" | "climax" | "resolution"`
- **EventImportance**: `"major" | "minor" | "background"`

---

## Subplot / PlotBeat / PlotIntersection

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Subplot` | `src/type/v2/subplot.ts` | `internal/domain/subplot.go:Subplot` | サブプロット |
| `PlotBeat` | 同 | `internal/domain/subplot.go:PlotBeat` | ビート |
| `PlotIntersection` | 同 | `internal/domain/subplot.go:PlotIntersection` | 交差 |

### Subplot フィールド対応

| TypeScript | Go | Notes |
|------------|----|-------|
| `type: "main" \| "subplot" \| "parallel" \| "background"` | `Type SubplotType` | string-typed const enum |
| `status: "active" \| "completed"` | `Status SubplotStatus` | string-typed const enum |
| `beats: PlotBeat[]` | `Beats []PlotBeat` | 値スライス |
| `focusCharacters?: { [id]: "primary" \| "secondary" }` | `FocusCharacters map[string]FocusCharacterPriority` | map + enum |
| `intersections?` | `Intersections []PlotIntersection` | nil-slice |
| `importance?: "major" \| "minor"` | `Importance *SubplotImportance` | pointer enum |
| `parentSubplotId?` | `ParentSubplotID *string` | pointer |
| `displayNames?` | `DisplayNames []string` | nil-slice |
| `relations?: SubplotRelations` | `Relations *SubplotRelations` | pointer |
| `details?: SubplotDetails` | `Details *SubplotDetails` | pointer |

### PlotBeat フィールド対応

| TypeScript | Go | Notes |
|------------|----|-------|
| `id`, `title`, `summary` | `ID`, `Title`, `Summary string` | 直接 |
| `structurePosition: BeatStructurePosition` | `StructurePosition StructurePosition` | string-typed const enum |
| `chapter?: string` | `Chapter *string` | pointer |
| `characters?: string[]` | `Characters []string` | nil-slice |
| `settings?: string[]` | `Settings []string` | nil-slice |
| `timelineEventId?: string` | `TimelineEventID *string` | pointer |
| `preconditionBeatIds?: string[]` | `PreconditionBeatIDs []string` | nil-slice |

### PlotIntersection フィールド対応

| TypeScript | Go | Notes |
|------------|----|-------|
| `id`, `summary` | `ID`, `Summary string` | 直接 |
| `sourceSubplotId`, `sourceBeatId` | `SourceSubplotID`, `SourceBeatID string` | 直接 |
| `targetSubplotId`, `targetBeatId` | `TargetSubplotID`, `TargetBeatID string` | 直接 |
| `influenceDirection: "forward" \| "backward" \| "mutual"` | `InfluenceDirection InfluenceDirection` | string-typed const enum（required） |
| `influenceLevel?: "high" \| "medium" \| "low"` | `InfluenceLevel *InfluenceLevel` | pointer enum |

### SubplotDetails union

| TS field | Go field |
|----------|----------|
| `description?` | `Description StringOrFileRef` |
| `theme?` | `Theme StringOrFileRef` |
| `notes?` | `Notes StringOrFileRef` |

旧 `struct { Inline string; FileRef *string }` は **Wave-A2-pre で削除**。

### StructurePosition の値リスト（TS source: `BeatStructurePosition`）

5-stage arc 固定:

| 値 | 用途 |
|----|------|
| `"setup"` | 導入 |
| `"rising"` | 上昇 |
| `"climax"` | 頂点 |
| `"falling"` | 下降 |
| `"resolution"` | 結末 |

旧版ドキュメントに "TBD" や 3 値案があった場合、本リスト（TS `src/type/v2/subplot.ts` 真偽値）が真。

### その他 enum

- **SubplotImportance**: `"major" | "minor"`
- **FocusCharacterPriority**: `"primary" | "secondary"`
- **InfluenceDirection**: `"forward" | "backward" | "mutual"`
- **InfluenceLevel**: `"high" | "medium" | "low"`

---

## Fixture サンプルでの検証

以下の 3 サンプルプロジェクトで各型の互換性を contract test で検証する（Wave-A2 以降の予定）:

- `samples/cinderella` - Character, Setting, Foreshadowing の基本
- `samples/momotaro` - Timeline/Event, CharacterPhase の複雑性
- `samples/mistery/old-letter-mystery` - Subplot/Intersection, 高度な検出ルール

Go parser の成功基準:

- すべての entity file を JSON 化できる
- JSON を Go struct に unmarshal できる（StringOrFileRef はカスタム unmarshaler を後続 wave で追加予定）
- 各 struct の validation が通る

---

## 今後の作業

- [ ] StringOrFileRef の `MarshalJSON` / `UnmarshalJSON` 実装（TS の `string | { file: string }` 双方向対応）
- [ ] Foreshadowing / Subplot 用の DetectionHints（必要が確定したら追加、命名は per-entity prefix）
- [ ] contract test fixture を生成（Wave-A2 以降）
