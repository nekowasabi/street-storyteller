# title: 原稿への伏線反映機能

## 概要

- 原稿ファイル（manuscripts/*.md）で伏線を参照できるようにする
- Front-matterで章に関連する伏線を宣言
- 本文中で`@伏線ID`形式で伏線を参照
- LSP/HTML出力で伏線の回収状況を視覚化

### goal

- 原稿執筆時に伏線を意識しながら書ける
- 伏線の設置・回収漏れを防げる
- 回収状況が一目でわかる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- 伏線をキャラクター・設定と同等のファーストクラスエンティティとして扱う
- 原稿内で伏線参照がハイライトされる（LSP/HTML）
- 伏線の回収状態（planted/resolved）で色が変わる

## 実装仕様

### Front-matter拡張

```yaml
---
storyteller:
  chapter_id: chapter01
  title: "灰かぶり姫の日常"
  order: 1
  characters:
    - cinderella
  settings:
    - mansion
  foreshadowings:           # 新規追加
    - ガラスの靴の伏線
    - 真夜中の期限
---
```

### @伏線ID参照

```markdown
シンデレラは@ガラスの靴の伏線を見つめた。 妖精は@真夜中の期限について警告した。
```

### ハイライト色

| ステータス         | 色                 | 用途         |
| ------------------ | ------------------ | ------------ |
| planted            | オレンジ (#e67e22) | 未回収の伏線 |
| partially_resolved | 黄 (#f1c40f)       | 部分回収     |
| resolved           | 緑 (#27ae60)       | 回収済み     |
| abandoned          | グレー (#95a5a6)   | 破棄         |

## 生成AIの学習用コンテキスト

### 既存実装（参照パターン）

- `src/application/meta/frontmatter_parser.ts`
  - FrontmatterData型定義、characters/settings解析パターン
- `src/lsp/detection/positioned_detector.ts`
  - PositionedMatch型、パターン検出ロジック
- `src/lsp/providers/entity_resolver.ts`
  - エンティティ解決パターン

### 伏線関連

- `src/type/v2/foreshadowing.ts`
  - Foreshadowing型定義
- `src/application/view/project_analyzer.ts`
  - ForeshadowingSummary型、loadForeshadowings()

### HTML出力

- `src/application/view/html_generator.ts`
  - renderForeshadowings()、CSS色定義

## Process

### process1 Front-matter拡張

#### sub1 FrontmatterData型にforeshadowingsフィールド追加

@target: `src/application/meta/frontmatter_parser.ts` @ref:
`src/type/v2/foreshadowing.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/frontmatter_parser_test.ts`

- [x] テストケースを作成（この時点で実装がないため失敗する）
  - foreshadowingsフィールドがパースできること
  - foreshadowingsが空の場合は空配列
  - foreshadowingsがない場合はundefined

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] FrontmatterData型に `foreshadowings?: string[]` 追加
- [x] パース処理で `foreshadowings` 抽出ロジック追加
  - 既存のcharacters/settingsと同じパターン

##### TDD Step 3: Refactor & Verify

- [x] `deno test tests/application/meta/frontmatter_parser_test.ts` 実行
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process2 伏線参照検出

#### sub1 PositionedDetectorにforeshadowing検出追加

@target: `src/lsp/detection/positioned_detector.ts` @ref:
`src/application/meta/reference_detector.ts`

##### TDD Step 1: Red

@test: `tests/lsp/detection/positioned_detector_test.ts`

- [x] テストケースを作成
  - `kind: "foreshadowing"` の検出
  - @伏線ID形式（明示参照）の検出
  - displayNamesによるパターンマッチ
  - 信頼度の計算

##### TDD Step 2: Green

- [x] PositionedMatch型のkindに `"foreshadowing"` 追加
- [x] 伏線ロードロジック追加（loadForeshadowings）
- [x] パターンマッチロジック追加
  - id, name, displayNames でマッチ

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

#### sub2 EntityResolverにforeshadowing解決追加

@target: `src/lsp/providers/entity_resolver.ts` @ref:
`src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red

@test: `tests/lsp/providers/entity_resolver_test.ts`

- [x] 伏線エンティティ解決テスト

##### TDD Step 2: Green

- [x] resolveForeshadowing() メソッド追加
- [x] getEntityAt() で foreshadowing 対応

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

---

### process3 LSPプロバイダー拡張

#### sub1 HoverProviderにforeshadowing対応

@target: `src/lsp/providers/hover_provider.ts` @ref:
`src/type/v2/foreshadowing.ts`

##### TDD Step 1: Red

@test: `tests/lsp/providers/hover_provider_test.ts`

- [x] 伏線へのホバーで情報表示テスト
  - 名前、タイプ、ステータス、概要
  - 設置章、関連キャラクター

##### TDD Step 2: Green

- [x] formatForeshadowingInfo() メソッド追加
- [x] ホバー処理で foreshadowing 対応

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

#### sub2 DefinitionProviderにforeshadowing対応

@target: `src/lsp/providers/definition_provider.ts`

##### TDD Step 1: Red

@test: `tests/lsp/providers/definition_provider_test.ts`

- [x] 伏線参照から定義ファイルへのジャンプテスト

##### TDD Step 2: Green

- [x] 伏線ファイルパス解決ロジック追加

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

#### sub3 SemanticTokensProviderにforeshadowing対応

@target: `src/lsp/providers/semantic_tokens_provider.ts`

##### TDD Step 1: Red

@test: `tests/lsp/providers/semantic_tokens_provider_test.ts`

- [x] foreshadowingトークンタイプ追加テスト
- [x] ステータス別モディファイア（planted/resolved）テスト

##### TDD Step 2: Green

- [x] TOKEN_TYPES に `foreshadowing` 追加
- [x] TOKEN_MODIFIERS に `planted`, `resolved` 追加
- [x] 伏線トークン生成ロジック

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

---

### process4 HTML出力拡張

#### sub1 ProjectAnalyzerで章-伏線関連付け

@target: `src/application/view/project_analyzer.ts`

##### TDD Step 1: Red

@test: `tests/application/view/project_analyzer_test.ts`

- [x] 章ごとの伏線情報収集テスト

##### TDD Step 2: Green

- [x] ChapterSummary型に `foreshadowings: string[]` 追加
- [x] Front-matterから伏線ID抽出

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

#### sub2 HtmlGeneratorで原稿内伏線ハイライト

@target: `src/application/view/html_generator.ts`

##### TDD Step 1: Red

@test: `tests/application/view/html_generator_test.ts`

- [x] 原稿HTML化時の伏線ハイライトテスト
- [x] planted/resolved で色が変わるテスト

##### TDD Step 2: Green

- [x] renderManuscriptContent() で伏線参照をspan化
- [x] CSS追加（.foreshadowing-ref.planted, .foreshadowing-ref.resolved）

##### TDD Step 3: Refactor & Verify

- [x] テスト実行・通過確認

---

### process10 統合テスト

#### sub1 cinderellaプロジェクトでのシナリオテスト

@target: `tests/scenario/cinderella_foreshadowing_test.ts`

- [x] 原稿にforeshadowings追加
- [x] 本文に@伏線ID参照追加
- [x] view browserコマンドでHTML出力確認
- [x] 伏線ハイライトが正しく表示されることを確認

---

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [x] 共通パターンの抽出
- [x] エンティティ種別（character/setting/foreshadowing）の汎用化検討

---

### process200 ドキュメンテーション

- [x] CLAUDE.md の伏線セクション更新
- [x] docs/foreshadowing.md 作成（使用方法）
- [x] docs/lsp.md に伏線対応を追記

---

## 調査結果の根拠

### Front-matter解析（既存パターン）

**ファイル**: `src/application/meta/frontmatter_parser.ts` (208行)

```typescript
// 既存の実装パターン（Line 89-100）
const characters = record.characters;
if (characters !== undefined) {
  if (!Array.isArray(characters)) {
    return err({ code: "invalid_characters", message: "..." });
  }
  result.characters = characters.filter((c): c is string =>
    typeof c === "string"
  );
}
// → foreshadowingsも同じパターンで実装可能
```

### 参照検出（既存パターン）

**ファイル**: `src/lsp/detection/positioned_detector.ts` (265行)

```typescript
// 既存のPositionedMatch型（Line 20-30）
type PositionedMatch = {
  kind: "character" | "setting"; // ← "foreshadowing" を追加
  id: string;
  filePath: string;
  matchedPattern: string;
  positions: Array<{ line: number; character: number; length: number }>;
  confidence: number;
};
```

### セマンティックトークン（既存パターン）

**ファイル**: `src/lsp/providers/semantic_tokens_provider.ts`

```typescript
// 既存のトークンタイプ
const TOKEN_TYPES = ["character", "setting"]; // ← "foreshadowing" 追加
const TOKEN_MODIFIERS = ["highConfidence", "mediumConfidence", "lowConfidence"];
// ← "planted", "resolved" 追加
```

### HTML色定義（既存）

**ファイル**: `src/application/view/html_generator.ts` (Line 769-895)

```css
/* 既存のステータス色 - 伏線参照にも適用可能 */
.status-planted {
  border-left: 4px solid #e67e22;
}
.status-resolved {
  border-left: 4px solid #27ae60;
}
```
