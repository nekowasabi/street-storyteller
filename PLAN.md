# title: HTMLコメント行上アノテーション方式による伏線参照の改善

## 概要

- 現行の`@伏線ID`インライン方式を、HTMLコメント行上アノテーション方式に改善
- 原稿本文の可読性を向上させ、文字数カウントの正確性を確保
- 既存LSP機能との互換性を維持しながら、新方式を追加実装

### goal

- 作家が原稿を執筆する際、伏線アノテーションがテキストの可読性を阻害しない
- Markdownビューアで閲覧時、アノテーションが非表示になる
- LSPで伏線参照を検出し、診断・ホバー・ジャンプ機能が動作する

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- HTMLコメント行上アノテーション方式 `<!-- @foreshadowing:ID -->` を導入
- 既存の`@ID`インライン方式との後方互換性を維持
- 移行ツール `storyteller migrate annotations` を提供

## 実装仕様

### 構文仕様

```markdown
# 基本形式（推奨）

<!-- @foreshadowing:伏線ID -->

対象テキストの段落

# 短縮形式

<!-- @fs:伏線ID -->

対象テキストの段落

# 複数伏線

<!-- @fs:伏線A @fs:伏線B -->

この段落には複数の伏線

# 特定テキスト指定（精密モード・オプション）

<!-- @fs:伏線ID @target:"真夜中の12時" -->

「ただし、この魔法は真夜中の12時に解けてしまいます。必ずそれまでにお帰りなさい」
```

### 変換例

**Before（現行）**:

```markdown
「ただし、この魔法は真夜中の12時に解けてしまいます@ガラスの靴の伏線。必ずそれまでにお帰りなさい」
```

**After（新方式）**:

```markdown
<!-- @foreshadowing:ガラスの靴の伏線 -->

「ただし、この魔法は真夜中の12時に解けてしまいます。必ずそれまでにお帰りなさい」
```

## 生成AIの学習用コンテキスト

### LSP検出機構

- `src/lsp/detection/positioned_detector.ts`
  - `getPatternsWithConfidence()`: 既存の`@id`パターン検出ロジック
  - `findAllPositions()`: パターン位置の検出
  - `detectWithPositions()`: エンティティ検出のエントリポイント

### テストファイル

- `tests/lsp/positioned_detector_test.ts`
  - 既存の検出テストケース

### 原稿サンプル

- `samples/cinderella/manuscripts/chapter02.md`
  - 現行方式の使用例（62行目: `@ガラスの靴の伏線`）

### 調査した先行事例と採否理由

| 方式                     | 可読性   | LSP互換性    | 標準互換 | 採否  | 理由                 |
| ------------------------ | -------- | ------------ | -------- | ----- | -------------------- |
| 現行`@ID`インライン      | 低       | 高（実装済） | 低       | 現行  | 可読性問題あり       |
| Fountain `[[...]]`       | 中-高    | 中           | 低       | ×     | Markdown標準ではない |
| CriticMarkup `{>>...<<}` | 中       | 中           | 高       | △     | 構文がやや冗長       |
| **HTMLコメント**         | **最高** | **中**       | **最高** | **◎** | 標準・可読性最高     |
| 番号参照方式             | 最高     | 低           | 中       | ×     | 関連が分かりにくい   |
| 外部ファイル方式         | 最高     | 低           | 中       | ×     | 行番号ずれ問題       |

**Sources**:

- [Fountain Syntax](https://fountain.io/syntax/)
- [CriticMarkup](https://fletcher.github.io/MultiMarkdown-6/syntax/critic.html)
- [Material for MkDocs Annotations](https://squidfunk.github.io/mkdocs-material/reference/annotations/)
- [Markdown Comments](https://www.docstomarkdown.pro/comments-in-markdown/)

---

## Process

### process1 HTMLコメントアノテーション検出機能

#### sub1 アノテーションパーサーの実装

@target: `src/lsp/detection/annotation_parser.ts` (新規) @ref:
`src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/detection/annotation_parser_test.ts` (新規)

- [ ] 基本形式のパーステスト
  - `<!-- @foreshadowing:ガラスの靴の伏線 -->` →
    `{ type: "foreshadowing", id: "ガラスの靴の伏線" }`
- [ ] 短縮形式のパーステスト
  - `<!-- @fs:伏線ID -->` → `{ type: "foreshadowing", id: "伏線ID" }`
- [ ] 複数伏線のパーステスト
  - `<!-- @fs:伏線A @fs:伏線B -->` → 2つのアノテーション
- [ ] 特定テキスト指定のパーステスト
  - `<!-- @fs:伏線ID @target:"真夜中" -->` → target付きアノテーション
- [ ] 不正形式の除外テスト
  - 通常のHTMLコメント `<!-- 普通のコメント -->` は無視

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `AnnotationParser` クラスを作成
  - 正規表現:
    `/<!--\s*(@(?:foreshadowing|fs):([^\s>@]+)(?:\s+@target:"([^"]+)")?)+\s*-->/g`
- [ ] `parse(content: string): Annotation[]` メソッド実装
- [ ] `Annotation` 型定義
  ```typescript
  type Annotation = {
    type: "foreshadowing";
    id: string;
    target?: string;
    line: number;
    raw: string;
  };
  ```

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

---

#### sub2 アノテーションと段落の関連付けロジック

@target: `src/lsp/detection/annotation_resolver.ts` (新規) @ref:
`src/lsp/detection/annotation_parser.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/detection/annotation_resolver_test.ts` (新規)

- [ ] アノテーション直後の段落への関連付けテスト
  - アノテーション行の次の非空行から次の空行までを対象
- [ ] 複数アノテーションの関連付けテスト
- [ ] 空行を挟んだ場合のテスト
- [ ] ファイル末尾のアノテーションテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `AnnotationResolver` クラスを作成
- [ ] `resolve(annotations: Annotation[], content: string): ResolvedAnnotation[]`
      メソッド実装
- [ ] `ResolvedAnnotation` 型定義
  ```typescript
  type ResolvedAnnotation = Annotation & {
    targetRange: {
      startLine: number;
      endLine: number;
    };
  };
  ```

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process2 PositionedDetectorへの統合

#### sub1 アノテーション検出の統合

@target: `src/lsp/detection/positioned_detector.ts` @ref:
`src/lsp/detection/annotation_parser.ts`,
`src/lsp/detection/annotation_resolver.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/positioned_detector_test.ts` (追記)

- [ ] HTMLコメントアノテーションからの伏線検出テスト
  ```typescript
  Deno.test("detectWithPositions - HTML comment annotation", async () => {
    const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
  ```

「魔法は真夜中に解けます」`; // ガラスの靴の伏線エンティティが検出されること });

```
- [ ] 既存`@ID`方式との併用テスト
- [ ] confidence値のテスト（アノテーション経由 = 1.0）

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `getPatternsWithConfidence()` にアノテーションパターンを追加
- [ ] `detectWithPositions()` でアノテーション検出を統合
- [ ] アノテーション経由の検出は confidence: 1.0 を設定

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process3 診断機能の拡張

#### sub1 アノテーション診断の追加

@target: `src/lsp/diagnostics/diagnostics_generator.ts`
@ref: `src/lsp/detection/annotation_resolver.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/diagnostics_generator_test.ts` (追記)

- [ ] 存在しない伏線IDのアノテーションに警告を出すテスト
- [ ] FrontMatterに未登録のアノテーションに情報診断を出すテスト
- [ ] 有効なアノテーションには診断を出さないテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] アノテーションからの伏線ID抽出
- [ ] エンティティ存在確認
- [ ] 診断メッセージの生成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process4 移行ツールの実装

#### sub1 CLIコマンド `migrate annotations` の実装

@target: `src/cli/modules/migrate/annotations.ts` (新規)
@ref: `src/cli/command_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/modules/migrate/annotations_test.ts` (新規)

- [ ] 単一ファイルの変換テスト
- `@伏線ID` → `<!-- @foreshadowing:伏線ID -->` への変換
- [ ] 複数ファイルの一括変換テスト
- [ ] ドライランモードのテスト（変更なし、プレビューのみ）
- [ ] バックアップ作成テスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] コマンドパーサーの実装
```

storyteller migrate annotations [path] [--dry-run] [--backup]

```
- [ ] 変換ロジックの実装
- 正規表現: `/([「『（]?[^@\n]+)@([^\s。、！？」』）\n]+)([。、！？」』）]?)/g`
- 置換: `<!-- @foreshadowing:$2 -->\n$1$3`
- [ ] ファイル書き込み処理

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process5 ホバー・定義ジャンプの対応

#### sub1 アノテーション上のホバー情報

@target: `src/lsp/providers/hover_provider.ts`
@ref: `src/lsp/detection/annotation_resolver.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/hover_provider_test.ts` (追記)

- [ ] アノテーションコメント上でのホバーで伏線情報を表示するテスト
- [ ] アノテーション対象段落上でのホバーで伏線情報を表示するテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] アノテーション位置の検出
- [ ] 対象段落との関連付け
- [ ] ホバー情報の生成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process10 ユニットテスト（追加・統合テスト）

@test: `tests/lsp/annotation_integration_test.ts` (新規)

- [ ] エンドツーエンドの統合テスト
- 原稿ファイル読み込み → アノテーション検出 → 診断生成 → ホバー表示
- [ ] 既存`@ID`方式との併用テスト
- [ ] 大規模ファイルでのパフォーマンステスト

---

### process50 フォローアップ

_実装後に仕様変更などが発生した場合は、ここにProcessを追加する_

---

### process100 リファクタリング

- [ ] `PositionedDetector` クラスの責務分離検討
- インライン検出とアノテーション検出の分離
- [ ] 共通パターンの抽出
- [ ] 型定義の整理

---

### process200 ドキュメンテーション

- [ ] `docs/lsp.md` にアノテーション方式の説明を追加
- [ ] `CLAUDE.md` の「進行中の機能開発」セクションを更新
- [ ] `samples/cinderella/manuscripts/chapter02.md` を新方式に変換
- [ ] エディタ設定例の追加（VSCode, Neovim）
- アノテーションコメントのシンタックスハイライト設定

---

## 後方互換性

| 機能 | 現行`@ID`方式 | 新HTMLコメント方式 |
|------|--------------|-------------------|
| 明示的参照 | `@ガラスの靴の伏線` | `<!-- @fs:ガラスの靴の伏線 -->` |
| displayNames検出 | `ガラスの靴` (0.9) | 同様（本文検出は維持） |
| 移行期間 | サポート継続 | 新規推奨 |
| 信頼度 | 1.0 | 1.0 |

---

## 見積もり

| Process | 推定工数 |
|---------|----------|
| process1 | 中（1-2時間） |
| process2 | 小（30分-1時間） |
| process3 | 小（30分-1時間） |
| process4 | 中（1-2時間） |
| process5 | 小（30分-1時間） |
| process10 | 小（30分） |
| process100 | 小（30分） |
| process200 | 小（30分） |
| **合計** | **4-8時間** |
```
