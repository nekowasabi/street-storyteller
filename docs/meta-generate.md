# `storyteller meta generate` 実装メモ（Issue #4 / PLAN.md process1〜）

## 目的（何を実現したか）

Markdown
原稿（章）から、コンパニオンファイル方式の章メタデータ（`.meta.ts`）を半自動生成する
`storyteller meta generate` を実装した。

- Frontmatter から `chapter_id/title/order` などの基本情報を取り出す
- 原稿本文からキャラクター/設定の参照を自動検出し、信頼度つきでまとめる
- 検証ルール（validations）をテンプレート生成する（プリセット対応）
- `.meta.ts` を出力し、手動編集で拡張できる形にする
- Phase 3 として、プレビュー/インタラクティブ解決/バッチ処理を提供する

---

## 使い方（CLI）

```bash
# 基本（隣に <chapter>.meta.ts を出力）
storyteller meta generate manuscripts/chapter01.md

# 書き込み無しで生成結果をプレビュー
storyteller meta generate manuscripts/chapter01.md --dry-run --preview

# 既存ファイルがある場合、手動編集を保持しつつ auto ブロックだけ更新（推奨）
storyteller meta generate manuscripts/chapter01.md --update

# 曖昧/低信頼度の参照を対話的に解決（references を上書き）
storyteller meta generate manuscripts/chapter01.md --interactive

# validations をシーン別プリセットで置換
storyteller meta generate manuscripts/chapter01.md --preset dialogue

# バッチ（glob）
storyteller meta generate manuscripts/*.md --batch

# バッチ（dir, 再帰）
storyteller meta generate --dir manuscripts --recursive

# 監視（Markdown 変更→自動更新）
storyteller meta watch --dir manuscripts --recursive

# CI / pre-commit 用のチェック（生成できることを検証）
storyteller meta check --dir manuscripts --recursive
```

主なオプション:

- `--characters <ids>`: Frontmatter の characters を上書き（`,`区切り）
- `--settings <ids>`: Frontmatter の settings を上書き（`,`区切り）
- `--output <path>`: 単一ファイル生成時のみ出力先を指定（`--batch/--dir`
  と併用不可）
- `--dry-run`: ファイル出力しない（生成処理のみ）
- `--preview`: 生成内容のサマリを表示
- `--interactive`: 参照マッピングを対話的に解決
- `--preset <type>`: `battle-scene | romance-scene | dialogue | exposition`
- `--force`: 既存の出力ファイルを上書き
- `--update`: 既存の `.meta.ts` がある場合、マーカー付き auto
  ブロックのみ差分更新する
- `--batch`: 入力を glob として展開
- `--dir <dir>` / `--recursive, -r`: ディレクトリ一括

---

## `binding.yaml`（人間が確定した同義語を YAML で補完）

`ReferenceDetector` の検出候補を、TS 定義に加えて YAML で補完できる。

- 配置:
  - `src/characters/<id>.binding.yaml`
  - `src/settings/<id>.binding.yaml`
- 例:

```yaml
version: 1
patterns:
  - text: "勇者"
    confidence: 0.95
  - text: "アレクス"
    confidence: 0.95
excludePatterns:
  - "勇者という存在"
```

仕様:

- `patterns[].text` は substring 検出
- `confidence` は 0.0〜1.0 に clamp（未指定は 0.95）
- `excludePatterns` は `detectionHints.excludePatterns` と同様に減算される

---

## 出力される `.meta.ts` の形（概要）

- 先頭に自動生成ヘッダー + 生成日時
- `ChapterMeta` 型を `src/types/chapter.ts` から import
- 検出された entity（characters/settings）を import
- `export const <chapterId>Meta: ChapterMeta = {...}` を出力

生成される `exportName` は `chapter_id + "Meta"`（例: `chapter01Meta` ではなく
`chapter01Meta` と同等の命名だが、実装は `${id}Meta`）。

---

## 実装構成（どこに何があるか）

### アプリケーション層（生成パイプライン）

- `src/application/meta/frontmatter_parser.ts`
  - Markdown 先頭の `--- ... ---` を YAML として解析し、`storyteller:` 配下から
    `chapter_id/title/order/...` を取り出す
- `src/application/meta/reference_detector.ts`
  - `src/characters/*.ts` と `src/settings/*.ts` を動的 import して一覧をロード
  - 原稿本文を走査して参照検出（詳細は後述）
  - Frontmatter 指定（characters/settings）があれば統合（ハイブリッド）
- `src/application/meta/validation_generator.ts`
  - 検出結果から `character_presence` / `setting_consistency` を生成
  - `plot_advancement` / `custom` は TODO
    テンプレートとして生成（プリセットで置換される場合あり）
- `src/application/meta/typescript_emitter.ts`
  - `.meta.ts` を実際に書き出す（import パスを解決して整形する）
- `src/application/meta/meta_generator_service.ts`
  - 上記を束ね、`generateFromMarkdown()` で end-to-end 生成する

### ドメイン（プリセット）

- `src/domain/meta/preset_templates.ts`
  - `plot_advancement` の置換用プリセット（battle/romance/dialogue/exposition）

### CLI

- `src/cli/modules/meta/generate.ts`
  - `storyteller meta generate` の実装
  - `--preview/--interactive/--batch/--dir` などの取り回しもここ
- `src/cli/modules/meta/interactive_resolver.ts`
  - `patternMatches` を元に、曖昧/低信頼度の参照を対話で解決
- `src/cli/modules/meta/index.ts`
  - `meta` サブコマンドのヘルプ

---

## 参照検出ロジック（現状の仕様）

### ロード方法（重要）

`ReferenceDetector` は **プロジェクト内の TS を動的 import** して entity
を取得する。

- 期待する形: export された値が `{ id: string, name: string, ... }` を持つ
- `exportName` は、export 変数名（`export const hero = ...` なら `"hero"`）
- `filePath` は project root からの相対パス（例: `src/characters/hero.ts`）

### マッチの優先度と信頼度（Phase 2）

本文は単純な substring 出現回数で検出する（現状は正規表現ではない）。

候補と信頼度:

- `name`: `1.0`
- `displayNames[]`: `0.9`
- `aliases[]`: `0.8`
- `pronouns[]`: `0.6`
- `detectionHints.commonPatterns[]`: `detectionHints.confidence`（未指定時は
  `0.9`、0〜1に clamp）
- `<id>.binding.yaml patterns[]`: 指定された `confidence`（未指定時は `0.95`）

除外:

- `detectionHints.excludePatterns[]` があり、かつ `excludePattern` が対象
  pattern を含む場合、 `excludePattern` の出現回数分を減算する（誤検出の抑制）。
- `<id>.binding.yaml excludePatterns[]` も同様に減算する。

### Frontmatter 統合（ハイブリッド）

- Frontmatter の `characters/settings` は強制的に採用（confidence `1.0`）
- 本文検出と統合し、pattern/occurrences/confidence をマージする
- **Frontmatter に存在しない id が指定された場合はエラー**（unknown references）

### `patternMatches`

インタラクティブ解決やプレビューのため、pattern ごとに:

- `occurrences`（本文出現数）
- `confidence`（その pattern の信頼度）

を保持している。

---

## `.meta.ts` 出力ロジック（重要）

### project root の探索

`TypeScriptEmitter` は `outputPath` のディレクトリから上に辿り、`src/`
が存在する場所を project root とする。

### import パスの前提

生成された `.meta.ts` は次を前提に import を組み立てる:

- `src/types/chapter.ts` が project root に存在する
- characters/settings は `src/characters` / `src/settings` 配下で定義されている

---

## テスト（どこまで担保しているか）

- Unit:
  - Frontmatter 解析
  - TS emitter の出力
  - 参照検出（Phase 1〜2）
  - validations 生成
  - service 統合（dry-run/force 等）
  - プリセット
- CLI:
  - `meta generate` の引数/挙動（dry-run, preview, interactive, batch/dir）
- Integration:
  - `sample/`
    を使ったワークフロー（生成して期待値と部分比較、エラーケースも確認）

---

## 今後「重要」になること（実装上の注意点・改善ポイント）

### 1) 動的 import の副作用/安全性

現状は `src/characters/*.ts` などを **実行してロード** するため:

- entity ファイルに副作用があると、検出時に実行されうる
- 不正なプロジェクト（第三者のコード）に対して実行するのは危険

将来的には以下が重要:

- TS AST 解析（もしくは JSON/YAML の中間表現）で「実行せずに」メタ情報を読む
- あるいは `*.binding.yaml` 等の宣言ファイルを一次ソースにする

### 2) `detectionHints.commonPatterns` の「正規表現」対応

Issue #3/#4 の設計案では `commonPatterns`
が正規表現っぽい記述を含む可能性がある。 現状は substring
検索なので、`"「.*」と勇者"` のようなパターンはマッチしない。

次の一手としては:

- `commonPatterns` を `string | { regex: string }`
  のように区別できるスキーマにする
- 正規表現を許可する場合は ReDoS/暴走対策（タイムアウト/安全な限定）を用意する

### 3) 既存 `.meta.ts` の差分更新（`--update` / マーカーブロック方式）

`--force` の全上書きを避け、**auto ブロックのみ**を安全に更新できる。

- 新規生成される `.meta.ts` は以下のマーカーを持つ:
  - `// storyteller:auto:imports:start`〜`end`
  - `// storyteller:auto:core:start`〜`end`（title/order）
  - `// storyteller:auto:entities:start`〜`end`（characters/settings）
  - `// storyteller:auto:references:start`〜`end`
- `--update` はマーカーがある場合のみ差分更新する
- マーカーが無い既存ファイルは安全のため拒否する（`--force` で再生成して移行）

### 4) プロジェクト構造の多様化への対応

現在の探索/前提:

- project root は `src/` の存在で決めている
- 型は `src/types/chapter.ts` 固定

今後は:

- config（例: `.storyteller/config.json`）でパスを解決できるようにする
- 互換レイヤ（v1/v2 など）と合わせて、「どの型を import するか」を柔軟にする

### 5) 参照マッピングの永続化（binding 連携）

`*.binding.yaml` により、人間が確定した同義語・除外パターンを
次回以降の検出候補に反映できる。

---

## 関連ファイル（入口）

- CLI: `src/cli/modules/meta/generate.ts`
- サービス: `src/application/meta/meta_generator_service.ts`
- 検出: `src/application/meta/reference_detector.ts`
- 出力: `src/application/meta/typescript_emitter.ts`
- テスト: `tests/integration/meta_generate_workflow_test.ts`
