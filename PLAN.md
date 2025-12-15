# title: 時系列管理機能（Timeline）の実装

## 概要
- 物語の時系列をコードで管理し、HTMLで可視化する機能を実装
- MCP（Model Context Protocol）からも操作可能にし、Claude DesktopなどのAIツールとシームレスに連携

### goal
- `storyteller element timeline` / `storyteller element event` コマンドでタイムライン・イベントを作成できる
- `storyteller view browser` でHTMLにタイムラインを可視化できる
- MCP経由で `timeline_create`, `event_create` 等のツールが使用可能
- イベントとキャラクター・設定・チャプターの連携が表現される

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- Character/Settingと同様の設計パターンで、Timeline/TimelineEvent型を実装
- イベント間の因果関係（causedBy/causes）を表現可能にする
- HTMLで水平タイムライン図を生成し、シナリオファイルとの連携を可視化
- MCP Tools/Resources/Promptsでタイムラインを操作可能にする

## 実装仕様

### 型定義（設計書セクション3より）
- `TimelineEvent`: id, title, category, time, summary, characters, settings, chapters, causedBy, causes
- `Timeline`: id, name, scope, summary, events, parentTimeline, childTimelines, displayOptions
- `TimelineScope`: "story" | "world" | "character" | "arc"
- `EventCategory`: "plot_point" | "character_event" | "world_event" | "backstory" | "foreshadow" | "climax" | "resolution"
- `EventImportance`: "major" | "minor" | "background"
- `TimePoint`: order (必須), label, date, chapter

### ディレクトリ構造
```
src/
├── type/v2/timeline.ts           # 型定義
├── timelines/                     # ユーザープロジェクト用（サンプル）
├── cli/modules/element/
│   ├── timeline.ts               # timelineコマンド
│   └── event.ts                  # eventコマンド
├── cli/modules/view/
│   └── timeline.ts               # view timelineコマンド
├── application/view/
│   ├── project_analyzer.ts       # タイムライン読み込み追加
│   └── html_generator.ts         # タイムラインセクション追加
├── plugins/core/timeline/
│   └── plugin.ts                 # TimelinePlugin
└── mcp/
    ├── tools/definitions/
    │   ├── timeline_create.ts
    │   ├── event_create.ts
    │   ├── event_update.ts
    │   ├── timeline_view.ts
    │   └── timeline_analyze.ts
    ├── resources/
    │   ├── uri_parser.ts         # 拡張
    │   └── project_resource_provider.ts  # 拡張
    └── prompts/definitions/
        ├── timeline_brainstorm.ts
        ├── event_detail_suggest.ts
        ├── causality_analysis.ts
        └── timeline_consistency_check.ts
```

## 生成AIの学習用コンテキスト

### 型定義の参照
- `src/type/v2/character.ts`
  - Character型の設計パターン（必須メタデータ、オプショナル情報、detectionHints）
- `src/type/v2/setting.ts`
  - Setting型の設計パターン

### CLIコマンドの参照
- `src/cli/modules/element/character.ts`
  - ElementCharacterCommandの実装パターン（parseOptions, handle, ElementService連携）
- `src/cli/modules/element/setting.ts`
  - ElementSettingCommandの実装パターン

### MCPツールの参照
- `src/mcp/tools/definitions/element_create.ts`
  - MCPツール定義の実装パターン（inputSchema, execute, executeCliCommand連携）
- `src/mcp/tools/tool_registry.ts`
  - McpToolDefinition型の定義

### MCP Resourcesの参照
- `src/mcp/resources/project_resource_provider.ts`
  - ResourceProvider実装パターン（listResources, readResource）
- `src/mcp/resources/uri_parser.ts`
  - URIパーサーの実装パターン

### MCP Promptsの参照
- `src/mcp/prompts/definitions/character_brainstorm.ts`
  - McpPromptDefinition実装パターン

### HTML生成の参照
- `src/application/view/html_generator.ts`
  - HTMLセクション生成パターン（renderCharacters, renderSettings）
- `src/application/view/project_analyzer.ts`
  - プロジェクト解析パターン（loadCharacters, loadSettings）

### プラグインの参照
- `src/plugins/core/character/plugin.ts`
  - ElementPluginの実装パターン

---

## Process

### process1 Timeline型定義の実装
#### sub1 TimelineEvent型とTimeline型の定義
@target: `src/type/v2/timeline.ts`
@ref: `src/type/v2/character.ts`, `src/type/v2/setting.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/type/v2/timeline_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - TimelineEvent型が正しくエクスポートされること
  - Timeline型が正しくエクスポートされること
  - EventCategory型が7種類のリテラル型であること
  - TimelineScope型が4種類のリテラル型であること
  - TimePoint型がorder（必須）とlabel, date, chapter（オプショナル）を持つこと
  - causedBy, causesがstring[]型であること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] EventCategory型を定義（"plot_point" | "character_event" | "world_event" | "backstory" | "foreshadow" | "climax" | "resolution"）
- [ ] EventImportance型を定義（"major" | "minor" | "background"）
- [ ] TimePoint型を定義（order, label?, date?, chapter?）
- [ ] TimelineEvent型を定義（id, title, category, time, summary, characters, settings, chapters, causedBy?, causes?, importance?, endTime?, displayNames?, details?, detectionHints?）
- [ ] TimelineScope型を定義（"story" | "world" | "character" | "arc"）
- [ ] Timeline型を定義（id, name, scope, summary, events, parentTimeline?, childTimelines?, relatedCharacter?, displayNames?, displayOptions?, details?）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認: `deno test tests/type/v2/timeline_test.ts`
- [ ] 必要に応じてリファクタリング（JSDocコメント追加）
- [ ] 再度テストを実行し、通過を確認

---

### process2 TimelinePluginの実装
#### sub1 ElementPluginインターフェースに準拠したプラグイン作成
@target: `src/plugins/core/timeline/plugin.ts`
@ref: `src/plugins/core/character/plugin.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/plugins/core/timeline/plugin_test.ts`
- [ ] テストケースを作成
  - TimelinePluginがElementPluginインターフェースを実装すること
  - create()でタイムラインファイルを生成できること
  - validate()でタイムラインの整合性チェックができること
  - getFilePathPattern()が正しいパスパターンを返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] TimelinePluginクラスを作成
- [ ] create()メソッドを実装（Timeline → TypeScriptファイル生成）
- [ ] validate()メソッドを実装（基本的な整合性チェック）
- [ ] getFilePathPattern()を実装（`src/timelines/*.ts`）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process3 CLIコマンド（element timeline）の実装
#### sub1 ElementTimelineCommandの実装
@target: `src/cli/modules/element/timeline.ts`
@ref: `src/cli/modules/element/character.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/modules/element/timeline_test.ts`
- [ ] テストケースを作成
  - `--name`, `--scope`, `--summary` オプションが必須であること
  - scopeが "story" | "world" | "character" | "arc" のいずれかであること
  - タイムラインファイルが `src/timelines/{id}.ts` に作成されること
  - 作成されたファイルがTimeline型に準拠すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] ElementTimelineCommandクラスを作成
- [ ] parseOptions()メソッドを実装（id, name, scope, summary, parentTimeline, relatedCharacter）
- [ ] handle()メソッドを実装（ElementService連携）
- [ ] `src/cli/modules/element/index.ts` にコマンドを登録

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 ElementEventCommandの実装
@target: `src/cli/modules/element/event.ts`
@ref: `src/cli/modules/element/character.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/modules/element/event_test.ts`
- [ ] テストケースを作成
  - `--timeline`, `--id`, `--title`, `--category`, `--order`, `--summary` オプションが必須であること
  - categoryが有効な値であること
  - `--characters`, `--settings`, `--chapters` がカンマ区切りで指定可能なこと
  - `--caused-by`, `--causes` でイベント間の因果関係が設定できること
  - 既存のタイムラインファイルにイベントが追加されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] ElementEventCommandクラスを作成
- [ ] parseOptions()メソッドを実装
- [ ] handle()メソッドを実装（タイムラインファイル読み込み → イベント追加 → 保存）
- [ ] `src/cli/modules/element/index.ts` にコマンドを登録

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process4 ProjectAnalyzerへのタイムライン読み込み追加
#### sub1 loadTimelinesメソッドの実装
@target: `src/application/view/project_analyzer.ts`
@ref: `src/application/view/project_analyzer.ts`（既存のloadCharacters, loadSettings）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/project_analyzer_timeline_test.ts`
- [ ] テストケースを作成
  - `src/timelines/` ディレクトリからタイムラインを読み込めること
  - TimelineSummary型に変換されること
  - イベント一覧がEventSummary[]として含まれること
  - ProjectAnalysis.timelinesプロパティに格納されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] TimelineSummaryインターフェースを追加
- [ ] EventSummaryインターフェースを追加
- [ ] ProjectAnalysis.timelinesプロパティを追加
- [ ] loadTimelines()メソッドを実装
- [ ] analyzeProject()にloadTimelines()呼び出しを追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process5 HtmlGeneratorへのタイムラインセクション追加
#### sub1 renderTimelinesメソッドの実装
@target: `src/application/view/html_generator.ts`
@ref: `src/application/view/html_generator.ts`（既存のrenderCharacters, renderSettings）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/html_generator_timeline_test.ts`
- [ ] テストケースを作成
  - Timelinesセクションが生成されること
  - タイムラインカードが表示されること
  - イベントが時系列順に表示されること
  - キャラクター・設定・チャプターへのリンクが含まれること
  - 因果関係（causedBy/causes）が矢印で表現されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] renderTimelines()メソッドを実装
- [ ] タイムラインカードのHTML生成
- [ ] イベント一覧のHTML生成（水平タイムライン形式）
- [ ] 関連エンティティへのリンク生成
- [ ] CSS_STYLESにタイムライン用スタイルを追加
- [ ] generate()メソッドにTimelinesセクションを追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング（CSS最適化など）
- [ ] 再度テストを実行し、通過を確認

---

### process6 MCP Tools実装
#### sub1 timeline_createツールの実装
@target: `src/mcp/tools/definitions/timeline_create.ts`
@ref: `src/mcp/tools/definitions/element_create.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/timeline_create_test.ts`
- [ ] テストケースを作成
  - ツール名が "timeline_create" であること
  - inputSchemaが id, name, scope, summary を required としていること
  - execute()がElementTimelineCommandを呼び出すこと
  - 成功時にタイムラインが作成されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] timelineCreateTool定義を作成
- [ ] inputSchemaを定義
- [ ] execute()を実装（executeCliCommand連携）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub2 event_createツールの実装
@target: `src/mcp/tools/definitions/event_create.ts`
@ref: `src/mcp/tools/definitions/element_create.ts`

##### TDD Step 1: Red
@test: `tests/mcp/tools/definitions/event_create_test.ts`
- [ ] テストケースを作成

##### TDD Step 2: Green
- [ ] eventCreateTool定義を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub3 event_updateツールの実装
@target: `src/mcp/tools/definitions/event_update.ts`

##### TDD Step 1: Red
@test: `tests/mcp/tools/definitions/event_update_test.ts`
- [ ] テストケースを作成

##### TDD Step 2: Green
- [ ] eventUpdateTool定義を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub4 timeline_viewツールの実装
@target: `src/mcp/tools/definitions/timeline_view.ts`

##### TDD Step 1: Red
@test: `tests/mcp/tools/definitions/timeline_view_test.ts`
- [ ] テストケースを作成

##### TDD Step 2: Green
- [ ] timelineViewTool定義を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub5 timeline_analyzeツールの実装
@target: `src/mcp/tools/definitions/timeline_analyze.ts`

##### TDD Step 1: Red
@test: `tests/mcp/tools/definitions/timeline_analyze_test.ts`
- [ ] テストケースを作成

##### TDD Step 2: Green
- [ ] timelineAnalyzeTool定義を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub6 ToolRegistryへの登録
@target: `src/mcp/server/handlers/tools.ts`

- [ ] createDefaultToolRegistry()にタイムライン関連ツールを登録

---

### process7 MCP Resources実装
#### sub1 URIパーサー拡張
@target: `src/mcp/resources/uri_parser.ts`
@ref: `src/mcp/resources/uri_parser.ts`

##### TDD Step 1: Red
@test: `tests/mcp/resources/uri_parser_timeline_test.ts`
- [ ] テストケースを作成
  - `storyteller://timelines` → { type: "timelines" }
  - `storyteller://timeline/main_story` → { type: "timeline", id: "main_story" }
  - `storyteller://event/main_story/ball_invitation` → { type: "event", id: "main_story", subId: "ball_invitation" }

##### TDD Step 2: Green
- [ ] ParsedUri型にtimelines, timeline, timeline_events, eventを追加
- [ ] subIdプロパティを追加
- [ ] parseResourceUri()にタイムライン関連のパース処理を追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub2 ProjectResourceProvider拡張
@target: `src/mcp/resources/project_resource_provider.ts`
@ref: `src/mcp/resources/project_resource_provider.ts`

##### TDD Step 1: Red
@test: `tests/mcp/resources/project_resource_provider_timeline_test.ts`
- [ ] テストケースを作成
  - listResources()がtimelineリソースを含むこと
  - readResource("storyteller://timelines")が全タイムラインを返すこと
  - readResource("storyteller://timeline/{id}")が特定タイムラインを返すこと
  - readResource("storyteller://event/{tl_id}/{ev_id}")が特定イベントを返すこと

##### TDD Step 2: Green
- [ ] listResources()にタイムラインリソース追加
- [ ] readResource()にtimelines, timeline, eventケースを追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

---

### process8 MCP Prompts実装
#### sub1 timeline_brainstormプロンプトの実装
@target: `src/mcp/prompts/definitions/timeline_brainstorm.ts`
@ref: `src/mcp/prompts/definitions/character_brainstorm.ts`

##### TDD Step 1: Red
@test: `tests/mcp/prompts/definitions/timeline_brainstorm_test.ts`
- [ ] テストケースを作成

##### TDD Step 2: Green
- [ ] timelineBrainstormPrompt定義を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub2 その他のプロンプト実装
@target: `src/mcp/prompts/definitions/`

- [ ] event_detail_suggest.ts
- [ ] causality_analysis.ts
- [ ] timeline_consistency_check.ts

#### sub3 PromptRegistryへの登録
@target: `src/mcp/server/handlers/prompts.ts`

- [ ] createDefaultPromptRegistry()にタイムライン関連プロンプトを登録

---

### process9 view timelineコマンドの実装
#### sub1 ViewTimelineCommandの実装
@target: `src/cli/modules/view/timeline.ts`

##### TDD Step 1: Red
@test: `tests/cli/modules/view/timeline_test.ts`
- [ ] テストケースを作成
  - `storyteller view timelines` で一覧表示
  - `storyteller view timeline {id}` で詳細表示
  - `--json` でJSON出力
  - `--format mermaid` でMermaid図出力

##### TDD Step 2: Green
- [ ] ViewTimelineCommandクラスを作成
- [ ] handle()メソッドを実装

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] 全テストファイルを実行: `deno test`
- [ ] カバレッジ確認: `deno test --coverage`
- [ ] 統合テスト: タイムライン作成 → イベント追加 → HTML出力 → MCP操作の一連の流れ

---

### process50 フォローアップ
{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

---

### process100 リファクタリング

- [ ] 重複コードの抽出（Character/Setting/Timelineの共通処理）
- [ ] 型定義の整理（v1互換レイヤーの追加）
- [ ] パフォーマンス最適化（大量イベント時のHTML生成）

---

### process200 ドキュメンテーション

- [ ] `docs/timeline.md` - タイムライン機能のユーザーガイド作成
- [ ] `docs/mcp.md` - MCP統合の説明にタイムライン関連を追加
- [ ] `CLAUDE.md` - 進行中の機能開発セクションを更新
- [ ] サンプルプロジェクト（cinderella）にタイムラインサンプルを追加

---

## 調査結果の根拠

### 1. 型定義設計の根拠
- 既存の`Character`型（`src/type/v2/character.ts`）を参考に、必須メタデータとオプショナル情報を分離
- `detectionHints`はLSP統合用に設計されており、将来のイベント参照検出に活用可能
- 設計書セクション3で定義した型仕様に準拠

### 2. CLIコマンド設計の根拠
- `ElementCharacterCommand`（`src/cli/modules/element/character.ts`）の実装パターンを踏襲
- `BaseCliCommand`を継承し、`parseOptions()`と`handle()`を実装
- `ElementService`経由でプラグインシステムと連携

### 3. MCP統合設計の根拠
- `element_create`ツール（`src/mcp/tools/definitions/element_create.ts`）の実装パターンを踏襲
- `executeCliCommand()`でCLIコマンドハンドラーを再利用
- `ProjectResourceProvider`（`src/mcp/resources/project_resource_provider.ts`）のリソース提供パターンを踏襲

### 4. HTML生成設計の根拠
- `HtmlGenerator`（`src/application/view/html_generator.ts`）の`renderCharacters()`パターンを踏襲
- 水平タイムラインはCSS Flexboxで実装
- 設計書セクション5.2のHTML/CSS設計に準拠

### 5. 実装優先順位の根拠
- 設計書セクション10の優先順位に準拠
- 依存関係: 型定義 → Plugin → CLI → ProjectAnalyzer → HtmlGenerator → MCP
