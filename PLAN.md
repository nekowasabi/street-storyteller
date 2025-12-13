# title: Issue #4 メタデータ自動生成機能の実装（Phase 1〜3）

## 概要

- 章メタデータファイル（`.meta.ts`）を半自動的に生成するCLIコマンド
  `storyteller meta generate` を実装
- Markdownを解析してキャラクター・設定を自動検出し、TypeScriptファイルを出力
- ハイブリッド検出方式（Frontmatter +
  本文解析の統合）により高精度な参照マッピングを実現

### goal

- CLIコマンドで基本的なメタデータを自動生成できる
- Markdownを解析して使用キャラクター・設定を自動検出できる
- 自動生成後も手動でカスタマイズ可能な形式で出力される
- インタラクティブモードで曖昧な参照を解決できる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

### Phase 1: 基本的な自動生成（MVP）

- `storyteller meta generate` コマンドの実装
- Frontmatterからの基本情報抽出
- キャラクター・設定の自動検出（完全一致）
- 基本的な検証ルール生成
- TypeScriptファイル出力

### Phase 2: 高度な検出機能

- displayNames/aliasesを使った検出
- 文脈を考慮した参照検出
- 信頼度ベースの参照マッピング
- プリセット機能（battle-scene, romance-scene等）

### Phase 3: インタラクティブモード

- 曖昧な参照の確認プロンプト
- 検出結果のプレビュー表示
- 差分更新機能（既存メタデータの更新）
- バッチ処理（複数章を一括生成）

## 実装仕様

### 主要コマンド

```bash
# 基本的なメタデータを自動生成
storyteller meta generate manuscripts/chapter01.md

# オプション付き生成
storyteller meta generate manuscripts/chapter01.md \
  --characters hero,heroine \
  --settings kingdom \
  --preset battle-scene \
  --dry-run \
  --interactive
```

### 出力形式（ChapterMeta）

```typescript
export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  title: "旅の始まり",
  order: 1,
  characters: [hero, heroine],
  settings: [kingdom],
  validations: [...],
  references: {
    "勇者": hero,
    "エリーゼ": heroine,
  }
};
```

### 新規ファイル構成

```
src/
├── application/
│   └── meta/
│       ├── meta_generator_service.ts
│       ├── frontmatter_parser.ts
│       ├── reference_detector.ts
│       ├── validation_generator.ts
│       └── typescript_emitter.ts
├── cli/
│   └── modules/
│       └── meta/
│           ├── index.ts
│           └── generate.ts
└── domain/
    └── meta/
        ├── detection_result.ts
        └── preset_templates.ts
```

## 生成AIの学習用コンテキスト

### CLI基盤（コマンド実装パターン）

- `src/cli/base_command.ts`
  - 全コマンドの基底クラス。`handle()` メソッドを実装するパターン
- `src/cli/modules/element/character.ts`
  - ネストされたコマンド (`path: ["element", "character"]`) の実装例
- `src/cli/command_registry.ts`
  - コマンド登録、依存関係検証の参考
- `src/cli/types.ts`
  - `CommandHandler`, `CommandDescriptor`, `CommandContext` インターフェース

### サンプルメタデータ構造

- `sample/manuscripts/chapter01.md`
  - Frontmatter形式（chapter_id, title, order, characters, settings, summary）
- `sample/manuscripts/chapter01.meta.ts`
  - 期待される出力形式（ChapterMeta型）
- `sample/src/types/chapter.ts`
  - `ChapterMeta`, `ValidationRule` 型定義

### キャラクター・設定の型定義

- `src/type/v2/character.ts`
  - `detectionHints` (commonPatterns, excludePatterns, confidence)
  - `displayNames`, `aliases`, `pronouns` フィールド
- `sample/src/characters/hero.ts`
  - キャラクター定義例（detectionHints の具体例）
- `sample/src/settings/kingdom.ts`
  - 設定定義例

### 既存サービス層

- `src/application/element_service.ts`
  - ElementServiceの実装パターン
- `src/shared/result.ts`
  - `Result<T, E>` 型によるエラーハンドリング

## Process

### process1: Frontmatter解析機能

#### sub1-1: FrontmatterParser クラス実装

@target: `src/application/meta/frontmatter_parser.ts` @ref:
`sample/manuscripts/chapter01.md` (Frontmatter形式の参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_parser_test.ts`

- [x] テストケースを作成（この時点で実装がないため失敗する）
  - 正常なFrontmatter解析テスト
  - chapter_id, title, order, characters, settings の抽出テスト
  - 不正なFrontmatterのエラーハンドリングテスト
  - Frontmatterが存在しない場合のテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `FrontmatterData` インターフェース定義
  - chapter_id: string
  - title: string
  - order: number
  - characters?: string[]
  - settings?: string[]
  - summary?: string
- [x] `FrontmatterParser` クラス実装
  - `parse(markdownContent: string): Result<FrontmatterData, ParseError>`
  - YAML部分の抽出（`---` で囲まれた部分）
  - `@std/yaml` を使用してYAML解析

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

---

### process2: TypeScript出力機能

#### sub2-1: TypeScriptEmitter クラス実装

@target: `src/application/meta/typescript_emitter.ts` @ref:
`sample/manuscripts/chapter01.meta.ts` (出力形式の参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/typescript_emitter_test.ts`

- [x] テストケースを作成
  - ChapterMetaオブジェクトからTypeScriptコード生成テスト
  - インポート文の生成テスト
  - ファイル出力テスト
  - フォーマット（インデント等）のテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `TypeScriptEmitter` クラス実装
  - `emit(meta: ChapterMeta, outputPath: string): Promise<Result<void, EmitError>>`
  - インポート文生成ロジック（キャラクター・設定のパス解決）
  - ChapterMetaオブジェクトのシリアライズ
  - ファイル書き込み処理
- [x] 生成ヘッダーコメント追加
  - `// 自動生成: storyteller meta generate`
  - `// 生成日時: YYYY-MM-DD HH:mm:ss`

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] `deno fmt` でフォーマット確認
- [x] 再度テストを実行し、通過を確認

---

### process3: 参照検出エンジン（Phase 1: 完全一致）

#### sub3-1: ReferenceDetector クラス（基本実装）

@target: `src/application/meta/reference_detector.ts` @ref:
`sample/src/characters/hero.ts` (detectionHints の参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/reference_detector_test.ts`

- [x] テストケースを作成
  - Frontmatterからのキャラクター検出テスト
  - Frontmatterからの設定検出テスト
  - 本文からの完全一致検出テスト
  - 検出結果の統合（ハイブリッド）テスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `DetectionResult`, `DetectedEntity` インターフェース定義
  - characters: DetectedEntity[]
  - settings: DetectedEntity[]
  - confidence: number
- [x] `ReferenceDetector` クラス実装
  - `detect(content, frontmatter, projectPath): Promise<DetectionResult>`
  - Frontmatterのcharacters/settings配列を優先的に採用
  - プロジェクト内のキャラクター・設定定義ファイルを読み込み
  - 本文を走査し、name フィールドで完全一致検出

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process4: 検証ルール生成

#### sub4-1: ValidationGenerator クラス実装

@target: `src/application/meta/validation_generator.ts` @ref:
`sample/manuscripts/chapter01.meta.ts` (validations フィールドの参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/validation_generator_test.ts`

- [x] テストケースを作成
  - character_presence 検証ルール生成テスト
  - setting_consistency 検証ルール生成テスト
  - 空テンプレート（custom）の生成テスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `ValidationGenerator` クラス実装
  - `generate(detected: DetectionResult): ValidationRule[]`
  - character_presence: 主要キャラクターの出現確認
  - setting_consistency: 設定の一貫性チェック
  - plot_advancement: 空テンプレート（手動編集用）

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process5: MetaGeneratorService 統合

#### sub5-1: MetaGeneratorService クラス実装

@target: `src/application/meta/meta_generator_service.ts` @ref:
`src/application/element_service.ts` (サービス層の参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/meta_generator_service_test.ts`

- [x] テストケースを作成
  - Markdownファイルからメタデータ生成テスト
  - 全コンポーネント統合テスト
  - エラーハンドリングテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `MetaGeneratorService` クラス実装
  - `generateFromMarkdown(markdownPath, options): Promise<Result<ChapterMeta, Error>>`
  - FrontmatterParser, ReferenceDetector, ValidationGenerator の統合
  - TypeScriptEmitter への委譲

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process6: CLIコマンド実装

#### sub6-1: meta generate コマンド実装

@target: `src/cli/modules/meta/generate.ts` @ref:
`src/cli/modules/element/character.ts` (ネストコマンドの参考)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/meta_generate_command_test.ts`

- [x] テストケースを作成
  - 基本的なコマンド実行テスト
  - --characters, --settings オプションテスト
  - --output オプションテスト
  - --dry-run オプションテスト
  - --force オプションテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `MetaGenerateCommand` クラス実装（BaseCliCommand継承）
  - path: ["meta", "generate"]
  - オプション解析（characters, settings, output, dry-run, force）
  - MetaGeneratorService との連携
- [x] `src/cli/modules/meta/index.ts` 作成
  - meta サブコマンドの登録
- [x] `src/cli/modules/index.ts` 拡張
  - metaコマンド群の登録

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] `storyteller meta generate --help` の動作確認
- [x] 再度テストを実行し、通過を確認

---

### process7: Phase 2 - 高度な検出機能

#### sub7-1: displayNames/aliases による検出拡張

@target: `src/application/meta/reference_detector.ts` @ref:
`src/type/v2/character.ts` (detectionHints の定義)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/reference_detector_test.ts`

- [x] テストケースを追加
  - displayNames による検出テスト
  - aliases による検出テスト
  - pronouns による検出テスト（低信頼度）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] ReferenceDetector 拡張
  - detectionHints.commonPatterns でマッチング
  - excludePatterns で誤検出を除外
  - 信頼度スコア計算（完全一致: 1.0, displayNames: 0.9, aliases: 0.8, pronouns:
    0.6）

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub7-2: プリセット機能

@target: `src/domain/meta/preset_templates.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/domain/meta/preset_templates_test.ts`

- [x] テストケースを作成
  - battle-scene プリセット適用テスト
  - romance-scene プリセット適用テスト
  - dialogue プリセット適用テスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `PresetType` 型定義 ("battle-scene" | "romance-scene" | "dialogue" |
      "exposition")
- [x] `Preset` インターフェース定義
- [x] 各プリセットの検証ルールテンプレート定義
- [x] `--preset` オプション対応

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process8: Phase 3 - インタラクティブモード

#### sub8-1: 曖昧な参照の確認プロンプト

@target: `src/cli/modules/meta/interactive_resolver.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/meta_interactive_resolver_test.ts`

- [x] テストケースを作成
  - 曖昧な参照の検出テスト
  - ユーザー選択のシミュレーションテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `InteractiveResolver` クラス実装
  - 低信頼度の参照を抽出
  - ユーザープロンプト表示
  - 選択結果の反映
- [x] `--interactive` オプション対応

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub8-2: プレビュー機能

@target: `src/cli/modules/meta/generate.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/meta_preview_test.ts`

- [x] テストケースを作成
  - --dry-run --preview の出力フォーマットテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] プレビュー表示機能実装
  - 検出結果のテーブル表示
  - 信頼度スコアの表示
  - キャラクター・設定の出現回数表示

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub8-3: バッチ処理

@target: `src/cli/modules/meta/generate.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/meta_batch_test.ts`

- [x] テストケースを作成
  - 複数ファイルの一括処理テスト
  - --batch オプションテスト
  - --dir オプションテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] バッチ処理機能実装
  - glob パターン対応 (`manuscripts/*.md`)
  - ディレクトリ指定対応 (`--dir`)
  - 進捗表示

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process10: ユニットテスト（追加・統合テスト）

#### sub10-1: 統合テスト

@target: `tests/integration/meta_generate_workflow_test.ts`

- [x] 基本ワークフローテスト
  - Markdownファイル → メタデータ生成 → TypeScript出力
- [x] サンプルファイルを使用したE2Eテスト
  - `sample/manuscripts/chapter01.md` を入力
  - 生成されたファイルと `sample/manuscripts/chapter01.meta.ts` を比較
- [x] エラーケーステスト
  - 不正なMarkdownファイル
  - 存在しないキャラクター・設定参照

---

### process50: フォローアップ

{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

---

### process100: リファクタリング

- [ ] コード品質の確認
  - 型定義の一貫性チェック
  - エラーハンドリングの統一
  - ロギングの適切性確認
- [ ] パフォーマンス最適化
  - 大量ファイル処理時のメモリ使用量
  - 並列処理の検討
- [x] `deno fmt` でフォーマット統一
- [ ] `deno lint` でリンターチェック

---

### process200: ドキュメンテーション

- [x] README.md 更新
  - `storyteller meta generate` コマンドの説明
  - オプション一覧
  - 使用例
- [x] ARCHITECTURE.md 更新
  - MetaGeneratorService の設計
  - 検出アルゴリズムの説明
- [ ] Issue #4 のクローズ
  - 実装完了の確認
  - チェックリストの更新

---

## 見積もり

| フェーズ | プロセス                    | 見積もり   |
| -------- | --------------------------- | ---------- |
| Phase 1  | process1-6 (MVP)            | 3-4日      |
| Phase 2  | process7 (高度な検出)       | 2-3日      |
| Phase 3  | process8 (インタラクティブ) | 2-3日      |
| テスト   | process10 (統合テスト)      | 1-2日      |
| **合計** |                             | **8-12日** |

## 実装計画メタ情報

**Issue**:
[#4 メタデータ自動生成機能の実装](https://github.com/nekowasabi/street-storyteller/issues/4)
**Planning Date**: 2025-12-07 **Estimated Duration**: 8-12日

**次のステップ**:

1. process1 (FrontmatterParser) の実装開始
2. TDDでテストを先に作成
3. 最初のPR: process1-2 完了後、基盤機能のレビュー依頼
