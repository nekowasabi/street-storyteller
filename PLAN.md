# title: manuscript_binding MCPツール（FrontMatterエンティティ紐付け）

## 概要

- 原稿ファイル（Markdown）のFrontMatterにエンティティ（キャラクター、伏線、設定など）を紐付け・編集・削除するMCPツールを追加する

### goal

- MCP経由で原稿ファイルのFrontMatterを操作し、物語要素との関連付けを管理できる
- `manuscript_binding` ツールで add/remove/set 操作を統一的に実行できる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- 統一ツール `manuscript_binding`
  で6種類のエンティティをFrontMatterに紐付け可能にする
- 存在しないIDはエラーで中断するバリデーション機能を実装する

## 実装仕様

### ツール入力スキーマ

```typescript
{
  manuscript: string;      // 原稿ファイルパス（必須）
  action: "add" | "remove" | "set";  // 操作タイプ（必須）
  entityType: "characters" | "settings" | "foreshadowings"
            | "timeline_events" | "phases" | "timelines";  // エンティティタイプ（必須）
  ids: string[];           // エンティティIDリスト（必須）
  validate?: boolean;      // ID存在確認（デフォルト: true）
}
```

### 操作定義

| action | 動作                                     |
| ------ | ---------------------------------------- |
| add    | 既存リストに追加（重複無視）             |
| remove | 既存リストから削除（存在しないIDは無視） |
| set    | リストを完全置換                         |

### 対象エンティティ（6種類）

1. `characters` - キャラクターID
2. `settings` - 設定ID
3. `foreshadowings` - 伏線ID
4. `timeline_events` - タイムラインイベントID（新規）
5. `phases` - キャラクターフェーズID（新規）
6. `timelines` - タイムラインID（新規）

### バリデーション戦略

| エンティティタイプ | 確認方法                                | 参照コード                             |
| ------------------ | --------------------------------------- | -------------------------------------- |
| characters         | `src/characters/{id}.ts` の存在確認     | `ProjectAnalyzer.loadCharacters()`     |
| settings           | `src/settings/{id}.ts` の存在確認       | `ProjectAnalyzer.loadSettings()`       |
| foreshadowings     | `src/foreshadowings/{id}.ts` の存在確認 | `ProjectAnalyzer.loadForeshadowings()` |
| timelines          | `src/timelines/{id}.ts` の存在確認      | `ProjectAnalyzer.loadTimelines()`      |
| timeline_events    | 全タイムラインをロードしevent.idを検索  | `TimelineSummary.events[].id`          |
| phases             | 全キャラクターをロードしphase.idを検索  | `CharacterSummary.phases[].id`         |

## 生成AIの学習用コンテキスト

### 既存FrontMatter実装

- `src/application/meta/frontmatter_parser.ts`
  - `FrontmatterParser` クラス: パース機能（読み取り専用）
  - `FrontmatterData` インターフェース: 拡張対象
  - `StorytellerYaml` 型: 内部型、同様に拡張

### MCPツール実装パターン

- `src/mcp/tools/tool_registry.ts`
  - `McpToolDefinition` 型: ツール定義の型
  - `ToolExecutionContext` 型: 実行コンテキスト
- `src/mcp/tools/definitions/element_create.ts`
  - 既存ツールの実装パターン参照
  - パラメータバリデーション
  - CLIアダプター連携
- `src/mcp/tools/cli_adapter.ts`
  - `executeCliCommand()`: CLIコマンド実行
- `src/mcp/server/handlers/tools.ts`
  - `createDefaultToolRegistry()`: ツール登録

### エンティティローダー

- `src/application/view/project_analyzer.ts`
  - `loadCharacters()`: キャラクターロード（L194-238）
  - `loadSettings()`: 設定ロード（L244-）
  - `loadTimelines()`: タイムラインロード
  - `loadForeshadowings()`: 伏線ロード
  - `CharacterSummary.phases`: フェーズ情報（L19-20）
  - `TimelineSummary.events`: イベント情報（L71）

### YAMLライブラリ

- `@std/yaml`: Deno標準ライブラリ
  - `parse`: YAML→オブジェクト
  - `stringify`: オブジェクト→YAML

### サンプルFrontMatter

- `samples/cinderella/manuscripts/chapter02.md`
  - 既存形式の参照（characters, settings, foreshadowings）

---

## Process

### process1 FrontmatterData型の拡張

#### sub1 FrontmatterData, StorytellerYaml型に新規フィールド追加

@target: `src/application/meta/frontmatter_parser.ts` @ref:
`samples/cinderella/manuscripts/chapter02.md`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_parser_test.ts`

- [ ] テストケースを作成（この時点で型定義がないため失敗する）
  - `timeline_events` フィールドを含むFrontMatterをパースできる
  - `phases` フィールドを含むFrontMatterをパースできる
  - `timelines` フィールドを含むFrontMatterをパースできる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `FrontmatterData` インターフェースに3フィールド追加
  ```typescript
  timeline_events?: string[];
  phases?: string[];
  timelines?: string[];
  ```
- [ ] `StorytellerYaml` 型に同様の3フィールド追加
- [ ] `validateRequiredFields()` メソッドで新フィールドを返却に含める

##### TDD Step 3: Refactor & Verify

- [ ] `deno test tests/application/meta/frontmatter_parser_test.ts`
      を実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process2 EntityValidatorクラスの実装

#### sub1 基本構造とcharacters/settings/foreshadowings/timelinesバリデーション

@target: `src/application/meta/entity_validator.ts`（新規作成） @ref:
`src/application/view/project_analyzer.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/entity_validator_test.ts`（新規作成）

- [ ] テストケースを作成
  - 存在するcharacter IDはvalidを返す
  - 存在しないcharacter IDはinvalidを返す
  - 存在するsetting IDはvalidを返す
  - 存在するforeshadowing IDはvalidを返す
  - 存在するtimeline IDはvalidを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `EntityValidator` クラスを作成
- [ ] `ValidationResult` 型を定義
  ```typescript
  interface ValidationResult {
    valid: boolean;
    invalidIds: string[];
    validIds: string[];
  }
  ```
- [ ] `validateIds(entityType, ids)` メソッドを実装
- [ ] `validateCharacterIds()` - `src/characters/{id}.ts` 存在確認
- [ ] `validateSettingIds()` - `src/settings/{id}.ts` 存在確認
- [ ] `validateForeshadowingIds()` - `src/foreshadowings/{id}.ts` 存在確認
- [ ] `validateTimelineIds()` - `src/timelines/{id}.ts` 存在確認

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング

#### sub2 timeline_eventsとphasesバリデーション

@target: `src/application/meta/entity_validator.ts` @ref:
`src/application/view/project_analyzer.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/entity_validator_test.ts`

- [ ] テストケースを追加
  - 存在するtimeline_event IDはvalidを返す
  - 存在しないtimeline_event IDはinvalidを返す
  - 存在するphase IDはvalidを返す
  - 存在しないphase IDはinvalidを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `validateTimelineEventIds()` を実装
  - `ProjectAnalyzer.loadTimelines()` を利用してタイムライン一覧取得
  - `timeline.events[].id` を全て収集
  - 指定IDの存在確認
- [ ] `validatePhaseIds()` を実装
  - `ProjectAnalyzer.loadCharacters()` を利用してキャラクター一覧取得
  - `character.phases[].id` を全て収集
  - 指定IDの存在確認

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] `ProjectAnalyzer` への依存注入を検討
- [ ] 再度テストを実行し、通過を確認

---

### process3 FrontmatterEditorクラスの実装

#### sub1 基本構造とaddEntities操作

@target: `src/application/meta/frontmatter_editor.ts`（新規作成） @ref:
`src/application/meta/frontmatter_parser.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_editor_test.ts`（新規作成）

- [ ] テストケースを作成
  - 空の配列にキャラクターを追加できる
  - 既存の配列にキャラクターを追加できる（重複無視）
  - Frontmatterがない場合エラーを返す
  - storytellerキーがない場合エラーを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `BindableEntityType` 型を定義（6種類）
- [ ] `EditResult` 型を定義
  ```typescript
  type EditResult = {
    content: string;
    changedFields: BindableEntityType[];
    addedIds: string[];
    removedIds: string[];
  };
  ```
- [ ] `EditError` 型を定義
- [ ] `FrontmatterEditor` クラスを作成
- [ ] `addEntities(content, entityType, ids)` メソッドを実装
  - FrontMatter抽出
  - YAMLパース
  - 配列に追加（重複除去）
  - YAML再構築
  - 本文と結合

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] YAMLインデント（スペース2つ）を確認

#### sub2 removeEntities操作

@target: `src/application/meta/frontmatter_editor.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_editor_test.ts`

- [ ] テストケースを追加
  - 存在するIDを削除できる
  - 存在しないIDは無視される
  - 削除後に空配列になった場合の処理

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `removeEntities(content, entityType, ids)` メソッドを実装
  - 配列からIDを除去
  - 空配列の場合はフィールドを削除または空配列を維持

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub3 setEntities操作

@target: `src/application/meta/frontmatter_editor.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_editor_test.ts`

- [ ] テストケースを追加
  - リストを完全置換できる
  - 空配列でsetした場合フィールドが削除/空になる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `setEntities(content, entityType, ids)` メソッドを実装
  - 既存配列を完全置換

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub4 新規フィールド（timeline_events, phases, timelines）対応

@target: `src/application/meta/frontmatter_editor.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_editor_test.ts`

- [ ] テストケースを追加
  - timeline_eventsフィールドをadd/remove/setできる
  - phasesフィールドをadd/remove/setできる
  - timelinesフィールドをadd/remove/setできる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] 既存実装で6種類のフィールドすべてに対応していることを確認
  - `BindableEntityType` に含まれていれば動作するはず

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process4 manuscript_binding MCPツールの実装

#### sub1 ツール定義と基本パラメータバリデーション

@target: `src/mcp/tools/definitions/manuscript_binding.ts`（新規作成） @ref:
`src/mcp/tools/definitions/element_create.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/definitions/manuscript_binding_test.ts`（新規作成）

- [ ] テストケースを作成
  - 必須パラメータ（manuscript, action, entityType, ids）欠落時にエラー
  - 不正なaction値でエラー
  - 不正なentityType値でエラー

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `manuscriptBindingTool` 定義を作成
  - `name: "manuscript_binding"`
  - `description`: ツール説明
  - `inputSchema`: 入力スキーマ定義
- [ ] `execute` 関数の骨格を実装
  - パラメータ抽出
  - 必須パラメータバリデーション
  - enum値バリデーション

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 ファイル読み込みとバリデーション連携

@target: `src/mcp/tools/definitions/manuscript_binding.ts` @ref:
`src/application/meta/entity_validator.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/definitions/manuscript_binding_test.ts`

- [ ] テストケースを追加
  - 存在しない原稿ファイルでエラー
  - validate=trueで存在しないIDでエラー
  - validate=falseで存在しないIDでも成功

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] 原稿ファイルパス解決（相対/絶対）
- [ ] ファイル存在確認
- [ ] `EntityValidator` でID存在確認
- [ ] バリデーションエラー時のエラーレスポンス

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub3 FrontmatterEditor連携とファイル書き込み

@target: `src/mcp/tools/definitions/manuscript_binding.ts` @ref:
`src/application/meta/frontmatter_editor.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/definitions/manuscript_binding_test.ts`

- [ ] テストケースを追加（統合テスト）
  - add操作でキャラクターを追加できる
  - remove操作で伏線を削除できる
  - set操作でtimeline_eventsを置換できる
  - 成功時に変更内容がレスポンスに含まれる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `FrontmatterEditor` でFrontMatter編集
- [ ] 編集後のファイル書き込み
- [ ] 成功レスポンスの構築

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub4 ツール登録

@target: `src/mcp/server/handlers/tools.ts`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `manuscript_binding.ts` からインポート追加
- [ ] `createDefaultToolRegistry()` に
      `registry.register(manuscriptBindingTool)` 追加

##### TDD Step 3: Refactor & Verify

- [ ] MCPサーバー起動確認
- [ ] ツール一覧に `manuscript_binding` が含まれることを確認

---

### process5 CLIコマンドの実装（オプション）

#### sub1 manuscriptモジュールとbindingコマンド

@target: `src/cli/modules/manuscript/binding.ts`（新規作成） @ref:
`src/cli/modules/element/character.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/modules/manuscript/binding_test.ts`（新規作成）

- [ ] テストケースを作成
  - 基本的なコマンド実行が成功する
  - `--json` オプションでJSON出力

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `ManuscriptBindingCommand` クラスを作成
- [ ] コマンドオプション定義
  - `--file`: 原稿ファイルパス
  - `--action`: add/remove/set
  - `--type`: エンティティタイプ
  - `--ids`: IDリスト（カンマ区切り）
  - `--no-validate`: バリデーションスキップ
  - `--json`: JSON出力

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] 全テストファイルを実行: `deno test`
- [ ] カバレッジ確認: `deno test --coverage`
- [ ] エッジケースの追加テスト
  - 日本語ID
  - 特殊文字を含むID
  - 大量のID（パフォーマンス）

---

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [ ] 重複コードの抽出
- [ ] エラーメッセージの統一
- [ ] 型安全性の強化

---

### process200 ドキュメンテーション

- [ ] `CLAUDE.md` の更新
  - MCPツール一覧に `manuscript_binding` 追加
  - FrontMatterの新規フィールド（timeline_events, phases, timelines）の説明追加
- [ ] `docs/mcp.md` の更新
  - `manuscript_binding` ツールの使用例追加
- [ ] `docs/cli.md` の更新（CLIコマンド実装時）
  - `storyteller manuscript binding` コマンドの説明追加
