# title: Issue #4 残タスク実装計画（binding / 差分更新 / watch / hooks / CI）

Issue #4 のうち **未完了のチェックボックス（6件）** を実装するための計画。
実装は既存アーキテクチャ（`src/application/meta/*` と
`src/cli/modules/meta/*`）に沿って行う。

## 対象（Issue #4 の未完了）

- Phase 2
  - [ ] binding.yamlファイルとの連携
- Phase 3
  - [ ] 差分更新機能（既存メタデータの更新）
- Phase 4
  - [ ] ファイル監視モード
  - [ ] Markdown変更時の自動更新
  - [ ] Git pre-commitフックとの統合
  - [ ] CI/CDでの自動検証

## 基本方針（前提）

- **TDD**: 追加機能は unit/integration テストを先に追加（Red → Green →
  Refactor）。
- **安全側の挙動**:
  - 既存 `.meta.ts` の手動編集領域を壊さない。
  - 更新が安全にできない場合は「拒否＋ガイド」を優先する（`--force`
    上書きは明示）。
- **互換性**:
  - 既存の `storyteller meta generate` の UX
    を壊さない（新オプション/新サブコマンドで拡張）。

---

## フェーズ設計（実装順）

### Phase A: `binding.yaml` 連携（検出精度の底上げ）

#### 目的

- 人間が確定した同義語・パターンを YAML で管理し、検出/マッピング精度を上げる。
- 既存の `displayNames/aliases/pronouns/detectionHints`
  を補完する（置換ではない）。

#### 仕様案（MVP）

- ファイル配置（既存サンプルに合わせる）:
  - `src/characters/<id>.binding.yaml`
  - `src/settings/<id>.binding.yaml`
- 例（案）:

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

- `patterns[].text` は substring 検出（現行の検出方式に合わせる）。
- `confidence` は 0.0〜1.0 に clamp（未指定は 0.95）。

#### 実装タスク

- [ ] `src/application/meta/binding_loader.ts` を追加（YAML
      読み込み＋スキーマ検証）
- [ ] `ReferenceDetector.loadEntities()` に binding 読み込みを統合
  - 対象: `src/characters/*.ts` / `src/settings/*.ts`
  - ルール: TS 由来の候補（name/displayNames/aliases/pronouns/detectionHints）＋
    binding を候補として統合
- [ ] unit テスト追加
  - binding のロード成功/失敗（存在しない、壊れた YAML、スキーマ不正）
  - 候補統合と `patternMatches` の信頼度優先順位
- [ ] `docs/meta-generate.md` を更新（binding の仕様/配置/優先度）

---

### Phase B: `.meta.ts` の差分更新（手動編集の保護）

#### 目的

- `--force` の全上書きを避け、**「自動更新して良い部分だけ」**
  を更新できるようにする。

#### 仕様案（MVP）

- CLI オプション追加:
  - `storyteller meta generate ... --update`（既存ファイルがある場合、差分更新を試みる）
- 更新対象（最初は安全な範囲に限定）:
  - import 群（必要な entity import の追加/削除）
  - `characters` / `settings`（検出結果に同期）
  - `references`（自動検出 or `--interactive` の解決結果に同期）
- **手動編集保護**:
  - `summary` / `plotPoints` / `validations` 等は保持（更新しない）。

#### 実装方式（段階的）

1. **マーカーブロック方式（推奨 / 安全）**
   - 新規生成ファイルは以下のブロックを持つ:
     - `// storyteller:auto:imports:start`〜`end`
     - `// storyteller:auto:references:start`〜`end`
     - `// storyteller:auto:entities:start`〜`end`（characters/settings）
   - `--update` はブロックがある場合のみ安全に置換できる。

2. **レガシー（マーカー無し）への対応（慎重）**
   - 最初は「拒否」し、`--migrate-markers`（一回限り）でマーカーを挿入する方向に寄せる。
   - どうしても必要なら後続で AST/構文解析による更新を検討（Issue #2/#3 の AST
     編集基盤と合流させる）。

#### 実装タスク

- [ ] `src/application/meta/typescript_emitter.ts` に更新 API を追加
  - `emit()` は現状維持
  - `updateOrEmit()`（仮）で `--update`
    を扱う（マーカーがあれば置換、なければ拒否）
- [ ] `src/cli/modules/meta/generate.ts` に `--update` を追加
  - `--force` と競合する場合のルール定義（例: `--force` 優先、または排他）
- [ ] unit/integration テスト追加
  - 手動 validations/summary が保持されること
  - import/references のみ更新されること
  - マーカー無しファイルでの安全な失敗
- [ ] `docs/meta-generate.md` を更新（更新ポリシーとマーカー仕様）

---

### Phase C: Watch モード（Markdown 変更→自動生成）

#### 目的

- Markdown 原稿の変更に追随して `.meta.ts` を更新し、手動更新コストを下げる。

#### 仕様案（MVP）

- 新サブコマンド（わかりやすさ優先）:
  - `storyteller meta watch --dir manuscripts --recursive [--preset ...] [--update]`
- 監視対象:
  - `.md` の `create/modify` のみ（`.meta.ts` を除外し、無限ループを防止）
- 実行特性:
  - デバウンス（例: 200〜500ms）で連続変更をまとめる
  - 失敗したファイルはエラーを出しつつ監視継続（全体停止しない）

#### 実装タスク

- [ ] `src/cli/modules/meta/watch.ts` を追加（`Deno.watchFs` + debounce）
- [ ] `src/cli/modules/meta/index.ts` に `watch` を登録
- [ ] `--update` と組み合わせて「安全に」更新
- [ ] integration テストは最小限（watch の E2E は不安定になりやすい）
  - 代替: watcher のコアロジック（イベント→対象ファイル解決）を関数分離して unit
    テスト
- [ ] README / docs を更新（watch の使い方）

---

### Phase D: pre-commit / CI（自動検証の導入）

#### 目的

- ローカル/CI で「メタデータが生成可能・整合している」ことを自動で担保する。

#### 仕様案（MVP）

- `storyteller meta check`（新規）
  - `--dir/--recursive/--batch` を受け取り、各 `.md` に対して
    - 生成が成功すること（frontmatter などの基本整合）
    - （任意）`.meta.ts` が存在すること
    - （マーカー方式が普及した後）auto ブロックが最新であること
- `scripts/install-precommit.sh`（既存 `scripts/install.sh` と並ぶ）で hook
  を設置
- GitHub Actions:
  - `deno task test`
  - `deno task meta:check`（例: `sample/manuscripts` を対象）

#### 実装タスク

- [ ] `src/cli/modules/meta/check.ts` を追加
- [ ] `deno.json` にタスク追加
  - `meta:check`（対象ディレクトリは引数で渡せる形）
- [ ] `scripts/install-precommit.sh` を追加（hook に `deno task meta:check`
      を設定）
- [ ] `.github/workflows/ci.yml`（または既存 CI があればそこ）へ `meta:check`
      を追加
- [ ] docs 更新（導入手順、失敗時の対応）

---

## 受け入れ条件（Done の定義）

- `binding.yaml`
  が存在する場合、検出候補として反映され、`--preview/--interactive` にも現れる。
- `--update` がマーカーブロックを持つ `.meta.ts` に対して安全に差分更新できる。
- `meta watch` が `.md` の変更に追従して `.meta.ts`
  を更新できる（ループしない）。
- `meta check` がローカル/CI で実行可能で、異常系で非 0 終了になる。

## 参考（実装メモ）

- 実装現状メモ: `docs/meta-generate.md`
- 既存テスト: `tests/integration/meta_generate_workflow_test.ts`

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
