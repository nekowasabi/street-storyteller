# title: 伏線（Foreshadowing）型の実装

## 概要

- 物語の伏線を管理し、回収状況を追跡・HTML可視化する機能を実現する
- 既存のCharacter, Setting, Timelineと同様の型システムを持つ新しい物語要素を追加

### goal

- `storyteller element foreshadowing` コマンドで伏線を作成できる
- `storyteller view foreshadowing` コマンドで伏線一覧と回収状況を確認できる
- `storyteller view` のHTML出力で伏線の回収率統計とカード一覧を可視化できる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- 伏線の状態管理（planted → partially_resolved → resolved）
- 回収情報の追跡（複数回の部分回収に対応）
- HTML出力での回収率統計・カード形式表示
- MCP連携でClaude Desktopから伏線管理可能

## 実装仕様

### Foreshadowing型の構造

```typescript
type ForeshadowingStatus =
  | "planted"
  | "partially_resolved"
  | "resolved"
  | "abandoned";
type ForeshadowingType =
  | "hint"
  | "prophecy"
  | "mystery"
  | "symbol"
  | "chekhov"
  | "red_herring";
type ForeshadowingImportance = "major" | "minor" | "subtle";

type PlantingInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
};

type ResolutionInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
  completeness: number; // 0.0〜1.0
};

type Foreshadowing = {
  id: string;
  name: string;
  type: ForeshadowingType;
  summary: string;
  planting: PlantingInfo;
  status: ForeshadowingStatus;
  importance?: ForeshadowingImportance;
  resolutions?: ResolutionInfo[];
  plannedResolutionChapter?: string;
  relations?: {
    characters: string[];
    settings: string[];
    relatedForeshadowings?: string[];
  };
  displayNames?: string[];
  details?: ForeshadowingDetails;
  detectionHints?: ForeshadowingDetectionHints;
};
```

### ファイル配置

- 伏線ファイル: `src/foreshadowings/{id}.ts`

## 生成AIの学習用コンテキスト

### 型定義パターン（v2）

- `src/type/v2/timeline.ts`
  - 4層構造（必須→オプション→詳細→検出ヒント）のパターン
  - TimelineEvent型の構造

- `src/type/v2/character.ts`
  - ハイブリッド詳細管理パターン（string | { file: string }）

### プラグイン実装パターン

- `src/plugins/core/timeline/plugin.ts`
  - ElementPluginインターフェースの実装
  - createElementFile()、validateElement()、exportElementSchema()の実装

- `src/plugins/core/timeline/validator.ts`
  - バリデーションルールの定義パターン

### CLIコマンド実装パターン

- `src/cli/modules/element/timeline.ts`
  - BaseCliCommandの継承パターン
  - オプション定義とパース処理
  - ElementServiceとの連携

- `src/cli/modules/element/index.ts`
  - CommandDescriptorの登録パターン
  - 子コマンドのマウント

### HTML出力パターン

- `src/application/view/html_generator.ts`
  - セクション生成パターン
  - CSSスタイル定義

- `src/application/view/project_analyzer.ts`
  - ProjectAnalysis型の拡張
  - 要素ロード処理

### MCPツール/リソースパターン

- `src/mcp/tools/definitions/timeline_create.ts`
  - McpToolDefinitionの構造
  - inputSchema定義
  - execute実装

- `src/mcp/resources/project_resource_provider.ts`
  - リソースURI登録パターン
  - 動的リソース生成

---

## Process

### process1 型定義の作成

#### sub1 Foreshadowing型の定義

@target: `src/type/v2/foreshadowing.ts` @ref: `src/type/v2/timeline.ts`,
`src/type/v2/character.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/type/v2/foreshadowing_test.ts`

- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - Foreshadowing型が正しくエクスポートされていることを確認
  - ForeshadowingStatus型の値が期待通りであることを確認
  - ForeshadowingType型の値が期待通りであることを確認
  - PlantingInfo型の構造が正しいことを確認
  - ResolutionInfo型の構造が正しいことを確認

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ForeshadowingStatus型を定義（planted, partially_resolved, resolved,
      abandoned）
- [ ] ForeshadowingType型を定義（hint, prophecy, mystery, symbol, chekhov,
      red_herring）
- [ ] ForeshadowingImportance型を定義（major, minor, subtle）
- [ ] PlantingInfo型を定義（chapter, description, excerpt?, eventId?）
- [ ] ResolutionInfo型を定義（chapter, description, excerpt?, eventId?,
      completeness）
- [ ] ForeshadowingDetails型を定義（intent?, readerImpact?, resolutionIdea?,
      notes?）
- [ ] ForeshadowingDetectionHints型を定義（commonPatterns, excludePatterns,
      confidence）
- [ ] ForeshadowingRelations型を定義（characters, settings,
      relatedForeshadowings?）
- [ ] Foreshadowing型を定義（必須・オプショナルフィールド）

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング（型の再利用性向上など）
- [ ] 再度テストを実行し、通過を確認

---

### process2 プラグイン実装

#### sub1 ForeshadowingPluginの作成

@target: `src/plugins/core/foreshadowing/plugin.ts` @ref:
`src/plugins/core/timeline/plugin.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/core/foreshadowing/plugin_test.ts`

- [ ] テストケースを作成
  - ForeshadowingPluginがElementPluginインターフェースを実装していること
  - createElementFile()がTypeScriptファイルを正しく生成すること
  - validateElement()が必須フィールドを検証すること
  - getElementPath()が`src/foreshadowings/{id}.ts`を返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ForeshadowingPluginクラスを作成
  - meta情報を定義（id: "storyteller.element.foreshadowing"）
  - elementType: "foreshadowing"を設定
- [ ] createElementFile()を実装
  - オプションからForeshadowing型オブジェクトを構築
  - TypeScriptファイル内容を生成
  - ファイルパス（src/foreshadowings/{id}.ts）を決定
- [ ] validateElement()を実装（validator.ts経由）
- [ ] exportElementSchema()を実装

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 バリデーターの作成

@target: `src/plugins/core/foreshadowing/validator.ts` @ref:
`src/plugins/core/timeline/validator.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/core/foreshadowing/validator_test.ts`

- [ ] テストケースを作成
  - 必須フィールド（id, name, type, summary, planting,
    status）が欠けている場合にエラー
  - statusがresolved/partially_resolvedの場合、resolutionsが必須
  - completenessが0.0〜1.0の範囲外の場合にエラー
  - typeがred_herringの場合、abandonedステータスを許容

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] validateForeshadowing()関数を実装
  - 必須フィールドチェック
  - 状態と回収情報の整合性チェック
  - completeness値の範囲チェック
  - typeとstatusの組み合わせチェック
- [ ] ValidationResult型を返す

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub3 プラグイン登録

@target: `src/plugins/core/foreshadowing/index.ts`, `src/core/plugin_system.ts`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] index.tsでForeshadowingPluginをエクスポート
- [ ] plugin_system.tsにForeshadowingPluginを登録

##### TDD Step 3: Refactor & Verify

- [ ] 既存テストが通過することを確認

---

### process3 CLIコマンド実装

#### sub1 element foreshadowingコマンド

@target: `src/cli/modules/element/foreshadowing.ts` @ref:
`src/cli/modules/element/timeline.ts`, `src/cli/modules/element/character.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/modules/element/foreshadowing_test.ts`

- [ ] テストケースを作成
  - --name, --type, --planting-chapter, --planting-descriptionが必須
  - 伏線ファイルがsrc/foreshadowings/{id}.tsに生成されること
  - --resolveオプションで回収情報を追加できること
  - --status plantedがデフォルトであること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ElementForeshadowingCommandクラスを作成
  - name: "foreshadowing"
  - path: ["element", "foreshadowing"]
- [ ] handle()を実装
  - オプションパース処理
  - Foreshadowingオブジェクト構築
  - ElementService経由でファイル生成
- [ ] parseOptions()を実装
  - 必須オプション: --name, --type, --planting-chapter, --planting-description
  - オプション: --id, --summary, --importance, --resolve関連

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 element foreshadowingコマンドDescriptor登録

@target: `src/cli/modules/element/index.ts`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] elementForeshadowingCommandDescriptorを定義
  - summary, usage, path, options, examplesを設定
- [ ] createElementDescriptor()の子コマンドに追加

##### TDD Step 3: Refactor & Verify

- [ ] 既存テストが通過することを確認
- [ ] `storyteller element foreshadowing --help`が正しく表示されること

#### sub3 view foreshadowingコマンド

@target: `src/cli/modules/view/foreshadowing.ts` @ref:
`src/cli/modules/view/timeline.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/modules/view/foreshadowing_test.ts`

- [ ] テストケースを作成
  - --listで伏線一覧を表示
  - --idで特定の伏線を表示
  - --status plantedで未回収のみフィルタ
  - --status resolvedで回収済みのみフィルタ
  - --jsonでJSON形式出力

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ViewForeshadowingCommandクラスを作成
- [ ] handle()を実装
  - 一覧表示モード
  - 詳細表示モード
  - ステータスフィルタ
  - JSON出力

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process4 HTML可視化実装

#### sub1 ProjectAnalyzerへの統合

@target: `src/application/view/project_analyzer.ts` @ref:
既存のloadCharacters(), loadSettings(), loadTimelines()実装

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/view/project_analyzer_foreshadowing_test.ts`

- [ ] テストケースを作成
  - ProjectAnalysisにforeshadowingsフィールドが含まれること
  - src/foreshadowings/*.tsから伏線をロードすること
  - ForeshadowingSummary型が正しく返されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ForeshadowingSummaryインターフェースを追加
  - id, name, type, summary, status, importance
  - plantingChapter, resolutions[], plannedResolutionChapter
  - relatedCharacters[], relatedSettings[], filePath
- [ ] ProjectAnalysisにforeshadowingsフィールドを追加
- [ ] loadForeshadowings()メソッドを実装
  - src/foreshadowings/*.tsをスキャン
  - 各ファイルからForeshadowingをロード
  - ForeshadowingSummaryに変換
- [ ] analyze()でloadForeshadowings()を呼び出し

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 HtmlGeneratorへの統合

@target: `src/application/view/html_generator.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/view/html_generator_foreshadowing_test.ts`

- [ ] テストケースを作成
  - 生成されたHTMLにForeshadowingsセクションが含まれること
  - 回収率統計が表示されること
  - 各伏線がカード形式で表示されること
  - ステータス別の色分けが適用されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] generateForeshadowingsSection()メソッドを追加
  - 統計サマリー（Total, Planted, Resolved, 回収率）
  - 伏線カード生成ループ
- [ ] 伏線カードのHTML構造を実装
  - 名前、タイプ、ステータス、重要度
  - 設置情報（チャプター、説明）
  - 回収情報（存在する場合）
  - 関連エンティティ
- [ ] CSSスタイルを追加
  - .foreshadowing-stats（統計バー）
  - .foreshadowing-card（カードスタイル）
  - .status-planted, .status-resolved等（ステータス色分け）
  - .importance-major等（重要度強調）
- [ ] generate()でgenerateForeshadowingsSection()を呼び出し

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process5 MCP統合

#### sub1 MCPツール定義

@target: `src/mcp/tools/definitions/foreshadowing_create.ts` @ref:
`src/mcp/tools/definitions/timeline_create.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/definitions/foreshadowing_create_test.ts`

- [ ] テストケースを作成
  - foreshadowing_createツールが定義されていること
  - inputSchemaが正しいこと
  - executeが伏線ファイルを生成すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] foreshadowingCreateToolを定義
  - name: "foreshadowing_create"
  - description: "伏線要素を作成します"
  - inputSchema: name, type, summary, plantingChapter, plantingDescription等
  - execute: ElementForeshadowingCommandを呼び出し

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 MCPツール登録

@target: `src/mcp/server/handlers/tools.ts`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] foreshadowingCreateToolをインポート
- [ ] createDefaultToolRegistry()で登録

##### TDD Step 3: Refactor & Verify

- [ ] 既存テストが通過することを確認

#### sub3 MCPリソース追加

@target: `src/mcp/resources/project_resource_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/resources/project_resource_provider_foreshadowing_test.ts`

- [ ] テストケースを作成
  - storyteller://foreshadowingsリソースが一覧に含まれること
  - storyteller://foreshadowing/{id}で個別伏線が取得できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] listResources()に伏線リソースを追加
  - storyteller://foreshadowings
  - 各伏線のstoryteller://foreshadowing/{id}
- [ ] readResource()で伏線リソースを処理

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] 全テストスイートを実行し、すべて通過することを確認
- [ ] 統合テストの追加
  - 伏線作成→回収→HTML表示の一連のフロー
  - MCP経由での伏線操作

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

### process100 リファクタリング

- [ ] 重複コードの抽出と共通化
- [ ] 型定義の最適化
- [ ] テストカバレッジの確認と向上

### process200 ドキュメンテーション

- [ ] CLAUDE.mdに伏線機能のドキュメントを追加
  - 型定義の説明
  - CLIコマンドの使用例
  - MCPツール/リソースの説明
- [ ] docs/foreshadowing.md を作成（オプション）

---

## 調査結果の根拠

### 既存実装パターンの調査結果

#### 型定義（src/type/v2/）

- **4層構造**: 必須メタデータ → オプション層 → ハイブリッド詳細層 →
  LSP検出ヒント層
- **ハイブリッド詳細管理**: `string | { file: string }`
  でインラインとファイル参照を選択可能
- **DetectionHints**: commonPatterns, excludePatterns, confidence
  でLSP検出を設定

#### プラグイン（src/plugins/core/）

- **ElementPlugin インターフェース**: createElementFile(), validateElement(),
  exportElementSchema()
- **バリデーター分離**: validator.ts で検証ロジックを独立管理
- **ファイルパス決定**: getElementPath() で要素タイプ別のパスを返す

#### CLI（src/cli/modules/element/）

- **BaseCliCommand継承**: name, path, handle() を定義
- **CommandDescriptor**: summary, usage, path, options, examples, children
- **ElementService連携**: createElement() でファイル生成を委譲

#### HTML出力（src/application/view/）

- **ProjectAnalyzer**: 各要素タイプのload*() メソッドで解析
- **HtmlGenerator**: generate*Section() で各セクションを生成
- **インラインCSS**: 約320行のスタイルを含むスタンドアロンHTML

#### MCP（src/mcp/）

- **ToolRegistry**: register() でツールを登録
- **ResourceProvider**: listResources(), readResource() を実装
- **動的リソース**: 各要素のstoryteller://{type}/{id} URIを動的生成
