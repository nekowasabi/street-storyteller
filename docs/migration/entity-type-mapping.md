# TypeScript Entity Types → Go Struct Mapping

マイグレーション時の 1:1 型対応ガイド。各 TypeScript 型の Go 実装では、フィールド差異（optional field の扱い、union 型の enum 化、ファイル参照の解決方式）を明示する。

## Character

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Character` | `src/type/v2/character.ts:95` | `internal/domain/character.go:Character` | 中核エンティティ |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | 識別子キー |
| `name: string` | `Name string` | 直接 | 表示名 |
| `role: "protagonist" \| "antagonist" \| ...` | `Role CharacterRole` | enum iota | union → enum 化必須 |
| `traits: string[]` | `Traits []string` | 直接 | スライス |
| `relationships: { [key: string]: RelationType }` | `Relationships map[string]RelationType` | 直接 | map 化 |
| `appearingChapters: string[]` | `AppearingChapters []string` | 直接 | |
| `summary: string` | `Summary string` | 直接 | |
| `displayNames?: string[]` | `DisplayNames []*string` | pointer or nil | optional → nil で表現 |
| `aliases?: string[]` | `Aliases []*string` | pointer or nil | |
| `pronouns?: string[]` | `Pronouns []*string` | pointer or nil | |
| `details?: { ... }` | `Details *CharacterDetails` | pointer or nil | nested struct |
| `detectionHints?: { ... }` | `DetectionHints *DetectionHints` | pointer or nil | |
| `phases?: CharacterPhase[]` | `Phases []*CharacterPhase` | 別型参照 | |

### 差異メモ

- **optional field の扱い**: TS では `field?: type` だが、Go では `*type` (pointer) または struct tag で nil 区別。プロジェクトの方針を決定すること。
- **union 型**: TS の union type literal（`"protagonist" | "antagonist"`）を Go enum iota に変換。定義は `type CharacterRole int` で。
- **ファイル参照**: `details?.description: string | { file: string }` のような TS union を Go では `string` + filepath 検証で対応。

---

## CharacterPhase

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `CharacterPhase` | `src/type/v2/character_phase.ts` | `internal/domain/character.go:CharacterPhase` | 差分適用方式 |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | フェーズ名 |
| `order: number` | `Order int` | 直接 | 順序付け |
| `description?: string \| { file: string }` | `Description string` + `DescriptionFile string` | union → 分割 | ファイル参照は別フィールドで保持 |
| `initial?: CharacterState` | `Initial *CharacterState` | pointer or nil | 初期状態 |
| `deltas?: CharacterState[]` | `Deltas []*CharacterState` | スライス | 差分リスト |

### 差異メモ

- **ファイル参照の分離**: `description` が文字列またはファイル参照の union のため、Go では `Description` と `DescriptionFile` に分割するか、`StringOrFileRef` 構造体を定義。

---

## CharacterState

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `CharacterState` | `src/type/v2/character_state.ts` | `internal/domain/character.go:CharacterState` | フェーズ内の属性差分 |

### 主要フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `traits?: string[]` | `Traits []*string` | pointer or nil | |
| `personality?: string[]` | `Personality []*string` | pointer or nil | |
| `appearance?: string` | `Appearance *string` | pointer or nil | |
| `relationships?: { [key: string]: RelationType }` | `Relationships map[string]RelationType` | nil-safe map | |

### 差異メモ

- **差分型の特性**: キャラクターの成長フェーズを段階的に表現するため、すべてのフィールドが optional。Go では nil/empty で「変化なし」を表現。

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
| `type: "location" \| "faction" \| "object" \| "concept"` | `Type SettingType` | enum iota | union → enum |
| `chapters: string[]` | `Chapters []string` | 直接 | 登場チャプタ |
| `summary: string` | `Summary string` | 直接 | |
| `displayNames?: string[]` | `DisplayNames []*string` | pointer or nil | |
| `details?: SettingDetails` | `Details *SettingDetails` | pointer or nil | nested |
| `relatedSettings?: string[]` | `RelatedSettings []*string` | pointer or nil | |
| `detectionHints?: DetectionHints` | `DetectionHints *DetectionHints` | pointer or nil | |

### 差異メモ

- **type の enum 化**: `"location" | "faction" | "object" | "concept"` → Go const with iota。

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
| `type: ForeshadowingType` | `Type ForeshadowingType` | enum iota | |
| `summary: string` | `Summary string` | 直接 | |
| `planting: PlantingInfo` | `Planting PlantingInfo` | nested struct | |
| `status: ForeshadowingStatus` | `Status ForeshadowingStatus` | enum iota | |
| `importance?: "major" \| "minor" \| "subtle"` | `Importance *ForeshadowingImportance` | pointer enum or nil | |
| `resolutions?: ResolutionInfo[]` | `Resolutions []*ResolutionInfo` | スライス or nil | |
| `plannedResolutionChapter?: string` | `PlannedResolutionChapter *string` | pointer or nil | |
| `relations?: { ... }` | `Relations *ForeshadowingRelations` | nested or nil | |
| `displayNames?: string[]` | `DisplayNames []*string` | pointer or nil | |

### 差異メモ

- **ForeshadowingType enum**: `"hint" | "prophecy" | "mystery" | "symbol" | "chekhov" | "red_herring"`
- **ForeshadowingStatus enum**: `"planted" | "partially_resolved" | "resolved" | "abandoned"`
- **ファイル参照**: `PlantingInfo.excerpt` と `ResolutionInfo.excerpt` が `string | { file: string }` union のため、分割か StringOrFileRef 構造体。

---

## Timeline / TimelineEvent

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Timeline` | `src/type/v2/timeline.ts:92` | `internal/domain/timeline.go:Timeline` | 時系列管理 |
| `TimelineEvent` | 同ファイル | `internal/domain/timeline.go:TimelineEvent` | タイムラインイベント |

### Timeline フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | |
| `scope: "story" \| "world" \| "character" \| "arc"` | `Scope TimelineScope` | enum iota | |
| `summary: string` | `Summary string` | 直接 | |
| `events: TimelineEvent[]` | `Events []*TimelineEvent` | 別型スライス | |
| `parentTimeline?: string` | `ParentTimelineID *string` | pointer or nil | 親タイムライン ID |
| `childTimelines?: string[]` | `ChildTimelineIDs []*string` | pointer or スライス | 子タイムライン ID リスト |
| `relatedCharacter?: string` | `RelatedCharacterID *string` | pointer or nil | キャラクター関連 |
| `displayNames?: string[]` | `DisplayNames []*string` | pointer or nil | |
| `detectionHints?: TimelineDetectionHints` | `DetectionHints *TimelineDetectionHints` | pointer or nil | |

### TimelineEvent フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | イベント固有 ID |
| `title: string` | `Title string` | 直接 | |
| `category: EventCategory` | `Category EventCategory` | enum iota | |
| `time: TimePoint` | `Time TimePoint` | nested struct | 時点情報 |
| `summary: string` | `Summary string` | 直接 | |
| `characters: string[]` | `CharacterIDs []string` | 直接 | 登場キャラ ID リスト |
| `settings: string[]` | `SettingIDs []string` | 直接 | 関連設定 ID リスト |
| `chapters: string[]` | `ChapterIDs []string` | 直接 | 関連チャプタ ID |
| `causedBy?: string[]` | `CausedByEventIDs []*string` | pointer or nil | 原因イベント ID リスト |
| `causes?: string[]` | `CausesEventIDs []*string` | pointer or nil | 結果イベント ID リスト |
| `importance?: EventImportance` | `Importance *EventImportance` | pointer enum or nil | |

### 差異メモ

- **scope enum**: `"story" | "world" | "character" | "arc"`
- **category enum**: 別途 `EventCategory` 定義（ドキュメントに記載なし、TS ファイル確認要）
- **因果関係**: `causedBy` / `causes` は ID リストで表現。GraphQL 的な実時間解決は不要。

---

## Subplot / PlotBeat / PlotIntersection

| TS Type | Location | Go Struct | Remarks |
|---------|----------|-----------|---------|
| `Subplot` | `src/type/v2/subplot.ts:176` | `internal/domain/subplot.go:Subplot` | サブプロット |
| `PlotBeat` | 同ファイル | `internal/domain/subplot.go:PlotBeat` | ビート |
| `PlotIntersection` | 同ファイル | `internal/domain/subplot.go:PlotIntersection` | 交差 |

### Subplot フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `name: string` | `Name string` | 直接 | |
| `type: "main" \| "subplot" \| "parallel" \| "background"` | `Type SubplotType` | enum iota | |
| `status: "active" \| "completed"` | `Status SubplotStatus` | enum iota | |
| `summary: string` | `Summary string` | 直接 | |
| `beats: PlotBeat[]` | `Beats []*PlotBeat` | 別型スライス | |
| `focusCharacters?: { [id: string]: "primary" \| "secondary" }` | `FocusCharacters map[string]FocusPriority` | map + enum | |
| `intersections?: PlotIntersection[]` | `Intersections []*PlotIntersection` | スライス or nil | |
| `importance?: "major" \| "minor"` | `Importance *SubplotImportance` | pointer enum or nil | |
| `parentSubplotId?: string` | `ParentSubplotID *string` | pointer or nil | |
| `displayNames?: string[]` | `DisplayNames []*string` | pointer or nil | |
| `relations?: SubplotRelations` | `Relations *SubplotRelations` | nested or nil | |

### PlotBeat フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `id: string` | `ID string` | 直接 | |
| `title: string` | `Title string` | 直接 | |
| `summary: string` | `Summary string` | 直接 | |
| `structurePosition: StructurePosition` | `StructurePosition StructurePosition` | enum | |
| その他フィールド | TBD | - | TS ファイル確認後追記 |

### PlotIntersection フィールド対応

| TypeScript | Go | 型変換 | Notes |
|------------|----|----|-------|
| `sourceSubplotId: string` | `SourceSubplotID string` | 直接 | |
| `sourceBeadId: string` | `SourceBeatID string` | 直接 | |
| `targetSubplotId: string` | `TargetSubplotID string` | 直接 | |
| `targetBeatId: string` | `TargetBeatID string` | 直接 | |
| `summary: string` | `Summary string` | 直接 | 交差の説明 |
| `influenceDirection?: "forward" \| "backward" \| "both"` | `InfluenceDirection *InfluenceDirection` | pointer enum or nil | |

### 差異メモ

- **enum 化が多い**: type, status, structurePosition, focusPriority, importance などが多数の union literal を持つため、Go iota enum の定義が多くなる。
- **PlotBeat フィールド**: TS ファイルの完全確認が必要。

---

## 共通パターン

### Optional Field の扱い

TS では `field?: type` だが、Go では以下のいずれかで実装:

**Option 1: Pointer type**
```go
type Character struct {
  ID string
  Aliases *[]string  // nil = missing
}
```

**Option 2: Presence field**
```go
type Character struct {
  ID string
  HasAliases bool
  Aliases []string
}
```

**推奨**: Option 1 (Pointer) で統一。JSON unmarshal の互換性が高い。

### Union Type の Enum 化

TS:
```typescript
type CharacterRole = "protagonist" | "antagonist" | "supporting" | "guest";
```

Go:
```go
type CharacterRole int

const (
  CharacterRoleUnknown    CharacterRole = iota
  CharacterRoleProtagonist
  CharacterRoleAntagonist
  // ...
)

func (cr CharacterRole) String() string { ... }
```

### ファイル参照の扱い

TS ではファイル参照を `{ file: string }` union で表現:
```typescript
description?: string | { file: string };
```

Go では以下のいずれか:

**Option 1: Separate field**
```go
type Character struct {
  Description string
  DescriptionFile string  // "" = no file
}
```

**Option 2: String-based URL**
```go
type Character struct {
  Description string  // "file://./path.md" のように prefix
}
```

**推奨**: Option 1 (Separate field) で明示的に。

---

## Fixture サンプルでの検証

以下の 3 サンプルプロジェクトで各型の互換性を contract test で検証:

- `samples/cinderella` - Character, Setting, Foreshadowing の基本
- `samples/momotaro` - Timeline/Event, CharacterPhase の複雑性
- `samples/mistery/old-letter-mystery` - Subplot/Intersection, 高度な検出ルール

Go parser の成功基準:
- すべての entity file を JSON 化できる
- JSON を Go struct に unmarshal できる
- 各 struct の validation が通る

---

## 今後の作業

- [ ] TS ソースコードの詳細確認により、未記載フィールドを埋める
- [ ] optional field の Go 実装方針を最終決定
- [ ] union type の Go enum iota 定義テンプレートを作成
- [ ] contract test fixture を生成
