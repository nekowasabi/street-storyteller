# title: details.description フィールド追加 & ファイル参照読み込み機能

## 概要

- CharacterDetailsとSettingDetailsに`description`フィールドを追加し、長文説明をMarkdownで記述できるようにする
- ファイル参照（`{ file: string }`）の内容を実際に読み込んで表示する機能を実装する

### goal

- summaryに収まらない詳細な説明をMarkdownファイルで管理できる
- `storyteller view character --id hero --details`
  でファイル内容を展開表示できる
- MCPリソースで`?expand=details`を指定するとファイル内容が解決される

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- Character/Settingの`details.description`フィールドでMarkdown長文をサポート
- ファイル参照の内容読み込み機能の実装
- CLI viewコマンドとMCPリソースでの詳細展開表示

## 実装仕様

### 型定義の変更

```typescript
// CharacterDetails型に追加
description?: string | { file: string };

// SettingDetails型に追加
description?: string | { file: string };
```

### FileContentReaderの仕様

- `resolveHybridField(value)`:
  文字列ならそのまま、`{ file: string }`なら読み込んで返す
- `readFileContent(relativePath)`: ファイル読み込み、フロントマター除去
- エラー時: `Result<T, FileContentError>`で適切なエラーを返す

### CLIコマンドの仕様

```bash
# --detailsオプションでファイル参照を解決して表示
storyteller view character --id hero --details
storyteller view setting --id royal_capital --details
```

### MCPリソースの仕様

```
storyteller://character/{id}?expand=details
storyteller://setting/{id}?expand=details
```

## 生成AIの学習用コンテキスト

### 型定義（変更対象）

- `src/type/v2/character.ts`
  - CharacterDetails型を確認（現在のフィールド: appearance, personality,
    backstory, relationships_detail, goals, development）
- `src/type/v2/setting.ts`
  - SettingDetails型を確認（現在のフィールド: geography, history, culture,
    politics, economy, inhabitants, landmarks）

### 既存のハイブリッド方式の実装パターン

- `src/plugins/features/details/validator.ts`
  - FileReferenceValidatorクラス: ファイル参照の存在確認ロジック
  - `fieldsToCheck`配列でチェック対象フィールドを定義
- `src/plugins/features/details/plugin.ts`
  - DetailsPluginクラス: 詳細追加・ファイル分離処理
  - `separateFiles()`メソッドでファイル分離を実装
- `src/plugins/features/details/templates.ts`
  - DetailField型: 利用可能な詳細フィールドの定義
  - DETAIL_TEMPLATES: 各フィールドのテンプレート
- `src/plugins/features/details/markdown.ts`
  - Markdown生成処理、フィールドラベル定義

### CLI表示の実装パターン

- `src/cli/modules/view/character.ts`
  - ViewCharacterCommandクラス: キャラクター表示コマンド
  - DefaultCharacterLoader: ファイルからキャラクター読み込み
  - formatCharacterBasic(): 基本情報のフォーマット
- `src/cli/modules/view/foreshadowing.ts`
  - view settingの実装パターン参考

### MCPリソースの実装パターン

- `src/mcp/resources/project_resource_provider.ts`
  - ProjectResourceProviderクラス: リソース提供

### テストパターン

- `tests/plugins/details_validator_test.ts`
  - FileReferenceValidatorのテスト例
- `tests/cli/modules/view/foreshadowing_test.ts`
  - viewコマンドのテスト例

## Process

### process1 型定義の拡張

#### sub1 CharacterDetails型にdescriptionフィールドを追加

@target: `src/type/v2/character.ts` @ref:
既存のCharacterDetails型定義（50-61行目）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/type/character_v2_test.ts`

- [ ] `description`フィールドを持つCharacterDetailsのテストケースを作成
  - インライン文字列: `description: "詳細な説明"`
  - ファイル参照: `description: { file: "characters/hero/description.md" }`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] CharacterDetails型に`description?: string | { file: string };`を追加
  - JSDocコメント: `/** 長文説明（summaryを超える詳細な説明） */`

##### TDD Step 3: Refactor & Verify

- [ ] `deno test tests/type/character_v2_test.ts`を実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 SettingDetails型にdescriptionフィールドを追加

@target: `src/type/v2/setting.ts` @ref: 既存のSettingDetails型定義（16-31行目）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/type/setting_v2_test.ts`（新規作成）

- [ ] `description`フィールドを持つSettingDetailsのテストケースを作成
  - インライン文字列とファイル参照の両方をテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] SettingDetails型に`description?: string | { file: string };`を追加
  - JSDocコメント: `/** 長文説明（summaryを超える詳細な説明） */`

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process2 FileContentReaderの実装

#### sub1 FileContentReaderクラスの新規作成

@target: `src/plugins/features/details/file_content_reader.ts`（新規） @ref:
`src/plugins/features/details/validator.ts`（ファイル読み込みパターン参考）
@ref: `src/shared/result.ts`（Result型参考）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/file_content_reader_test.ts`（新規）

- [ ] インライン文字列の解決テスト
  - 入力: `"詳細な説明"` → 出力: `ok("詳細な説明")`
- [ ] ファイル参照の解決テスト（成功ケース）
  - 入力: `{ file: "test.md" }` → 出力: `ok("ファイル内容")`
- [ ] ファイル参照の解決テスト（ファイル不存在）
  - 入力: `{ file: "nonexistent.md" }` → 出力:
    `err({ type: "file_not_found", ... })`
- [ ] undefinedの処理テスト
  - 入力: `undefined` → 出力: `ok(undefined)`
- [ ] フロントマター除去テスト
  - 入力: `---\ntitle: test\n---\n本文` → 出力: `ok("本文")`

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] FileContentReader クラスを作成
  - コンストラクタ: `constructor(private readonly projectRoot: string)`
- [ ] `resolveHybridField(value: string | { file: string } | undefined)`
      メソッド実装
  - 文字列: そのまま返す
  - `{ file: string }`: `readFileContent()`を呼び出す
  - undefined: `ok(undefined)`を返す
- [ ] `readFileContent(relativePath: string)` メソッド実装
  - `join(projectRoot, relativePath)`で絶対パス生成
  - `Deno.readTextFile()`でファイル読み込み
  - `stripFrontmatter()`でフロントマター除去
  - エラーハンドリング: `Deno.errors.NotFound`を捕捉
- [ ] `stripFrontmatter(content: string)` privateメソッド実装
  - `---`で始まるフロントマターを検出・除去
  - 本文のみを返す

##### TDD Step 3: Refactor & Verify

- [ ] `deno test tests/plugins/file_content_reader_test.ts`を実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process3 既存コードの更新（templates, markdown, validator, plugin）

#### sub1 templates.tsの更新

@target: `src/plugins/features/details/templates.ts` @ref:
既存のDetailField型定義（10-16行目）、DETAIL_TEMPLATES（21-41行目）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/details_templates_test.ts`（新規または既存）

- [ ] `isValidField("description")`が`true`を返すテスト
- [ ] `getTemplate("description")`が適切なテンプレートを返すテスト
- [ ] `getAvailableFields()`に`"description"`が含まれるテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] DetailField型に`| "description"`を追加
- [ ] DETAIL_TEMPLATESに`description`エントリを追加
  - テンプレート:
    `"（詳細な説明を記述してください。summaryよりも長い、詳細な情報を記載します）"`

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 markdown.tsの更新

@target: `src/plugins/features/details/markdown.ts` @ref:
`getFieldLabel`関数の既存ラベル定義

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/details_markdown_test.ts`（新規または既存）

- [ ] `description`フィールドの日本語ラベル「詳細説明」が返されるテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `getFieldLabel`関数内の`labels`オブジェクトに`description: "詳細説明"`を追加

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub3 validator.tsの更新

@target: `src/plugins/features/details/validator.ts` @ref:
`fieldsToCheck`配列の定義

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/details_validator_test.ts`

- [ ] `description`フィールドのファイル参照が検証されるテスト
  - 存在するファイル: エラーなし
  - 存在しないファイル: エラーあり

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `fieldsToCheck`配列に`"description"`を追加

##### TDD Step 3: Refactor & Verify

- [ ] `deno test tests/plugins/details_validator_test.ts`を実行し、通過することを確認

#### sub4 plugin.tsの更新

@target: `src/plugins/features/details/plugin.ts` @ref:
`separateFiles`メソッドの既存実装

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/plugins/details_plugin_test.ts`（新規または既存）

- [ ] `separateFiles`で`description`フィールドがファイル分離されるテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `separateFiles`メソッド内で`description`フィールドの処理を追加
  - `if (field === "description") { newDetails.description = { file: relativePath }; }`

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process4 CLI viewコマンドの拡張

#### sub1 view characterに--detailsオプションを追加

@target: `src/cli/modules/view/character.ts` @ref:
FileContentReader（process2で作成） @ref:
既存のformatCharacterBasic()メソッド（231-267行目）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/modules/view/character_details_test.ts`（新規）

- [ ] `--details`オプション指定時にdetailsフィールドが展開表示されるテスト
  - インライン文字列の表示
  - ファイル参照の内容読み込み・表示
- [ ] `--details`未指定時は従来通りの動作を確認するテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] コマンドオプションに`--details`を追加
  - `{ name: "--details", summary: "Expand detail fields (resolves file references)", type: "boolean" }`
- [ ] `handle`メソッド内で`--details`フラグの処理を追加
  - FileContentReaderをインスタンス化
  - `character.details`の各フィールドを解決
- [ ] `formatCharacterWithDetails(character, resolvedDetails)`メソッドを追加
  - 基本情報 + 詳細情報を展開表示

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] ヘルプメッセージの更新

#### sub2 view settingコマンドの新規作成

@target: `src/cli/modules/view/setting.ts`（新規） @ref:
`src/cli/modules/view/foreshadowing.ts`（実装パターン参考） @ref:
`src/cli/modules/view/character.ts`（実装パターン参考）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/modules/view/setting_test.ts`（新規）

- [ ] `--list`オプションで設定一覧が表示されるテスト
- [ ] `--id`オプションで特定設定が表示されるテスト
- [ ] `--details`オプションでファイル参照が解決されるテスト
- [ ] `--json`オプションでJSON形式出力されるテスト
- [ ] 存在しない設定IDでエラーが返されるテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] ViewSettingCommandクラスを作成
  - `name: "view_setting"`
  - `path: ["view", "setting"]`
- [ ] DefaultSettingLoaderクラスを作成
  - `src/settings/`からSettingを読み込む
- [ ] `handle`メソッドを実装
  - `--list`: 全設定一覧
  - `--id`: 特定設定表示
  - `--details`: FileContentReaderで解決
  - `--json`: JSON出力
- [ ] フォーマットメソッドを実装
  - `formatSettingBasic(setting)`
  - `formatSettingWithDetails(setting, resolvedDetails)`

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] CommandRegistryへの登録を確認

---

### process5 MCPリソースプロバイダーの更新

#### sub1 `?expand=details`クエリパラメータの対応

@target: `src/mcp/resources/project_resource_provider.ts` @ref:
FileContentReader（process2で作成） @ref: 既存のcharacter/settingリソース実装

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/resources/project_resource_provider_test.ts`（新規または既存）

- [ ] `storyteller://character/hero?expand=details`でdetailsが展開されるテスト
- [ ] `storyteller://setting/royal_capital?expand=details`でdetailsが展開されるテスト
- [ ] クエリパラメータなしでは従来通りの動作を確認するテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] URIパース処理にクエリパラメータ解析を追加
  - `new URL(uri)`でパース
  - `url.searchParams.get("expand")`でクエリ取得
- [ ] `expand=details`の場合、FileContentReaderで各フィールドを解決
- [ ] 解決後のオブジェクトをJSON化して返す

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] エラーケース（ファイル不存在）の動作確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] 全テストスイートの実行: `deno test`
- [ ] カバレッジ確認: `deno test --coverage`
- [ ] 統合テスト: CLI全体の動作確認
  - `storyteller view character --id hero --details`
  - `storyteller view setting --list`
  - `storyteller view setting --id royal_capital --details`

---

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [ ] 重複コードの抽出（フロントマター除去など）
- [ ] エラーメッセージの統一
- [ ] 型定義の整理

---

### process200 ドキュメンテーション

- [ ] `CLAUDE.md`の更新
  - CharacterDetails/SettingDetailsに`description`フィールドが追加されたことを記載
  - `--details`オプションの使用方法を追加
  - MCPリソースの`?expand=details`パラメータについて記載
- [ ] `docs/cli.md`の更新
  - `view character --details`オプションの説明追加
  - `view setting`コマンドの追加
- [ ] `docs/mcp.md`の更新
  - リソースURIの`?expand=details`パラメータについて記載
