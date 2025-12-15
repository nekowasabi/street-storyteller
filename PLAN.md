# title: Issue #9 / Phase 5「最適化と完成（2週間）」実装計画

## 概要

- Issue #9 の Phase 5（Week 11-12）で定義された「パフォーマンス最適化 /
  テストカバレッジ80% / ドキュメント完成 / CI/CD設定 /
  v1.0リリース」を、**根拠に基づいて実装できる粒度**まで分解した計画。
- 既存の Phase 1-4 の機能を壊さずに「プロダクションレディ」へ到達させる。

### goal

- 開発者が
  `deno task check`（または同等）で品質ゲート（fmt/lint/test/coverage/meta-check）を一発で通せる
- CI が Deno 2 系で安定稼働し、PR で品質ゲートが自動判定される
- `v1.0.0` リリースのための **タグ→ビルド→成果物配布** が自動化される

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- Phase 5 の完了条件（Issue #9 の定義）を満たす:
  - [x] パフォーマンス最適化（測定可能な形で実施）
  - [x] テストカバレッジ 80% 達成（CI で強制）
  - [x] ドキュメント完成（README + docs/ が現仕様と一致）
  - [x] CI/CD 設定（PR/タグで自動実行）
  - [x] v1.0 リリース準備（タグ・Release Notes・成果物）

## 実装仕様

### 調査結果（根拠）

- Phase 5 の要求は `ISSUE.md` に明記されている:
  - `ISSUE.md` の「Phase 5: 最適化と完成（Week
    11-12）」に、仕上げ項目が列挙（パフォーマンス/カバレッジ80%/ドキュメント/CI/CD/v1.0）。
- CI は現状 Deno 1 系で動いており、プロジェクトの Deno 2 前提とズレている:
  - `.github/workflows/ci.yml` が `deno-version: v1.x`
  - ローカルの `deno --version` は 2.5.1
  - `deno.json` のタスク構成も Deno 2 系運用が自然（ただし fmt/lint/coverage
    タスクが未整備）
- カバレッジ取得が現状 “安定運用できない” 状態:
  - `deno test --coverage=...` 実行時に、`test_output/.../*.ts`
    を参照するカバレッジレポート生成で失敗し得る（実測で失敗）
  - 原因の一つとして、テストが `test_output/` を `finally` で削除している（例:
    `tests/application/meta/binding_loader_test.ts` の `withTestDir`）
  - Deno 2 の `deno test --coverage` には `--coverage-raw-data-only`
    があり、レポート生成のタイミング問題を回避可能（`deno test --help`）
- 配布/パッケージング経路が “あるが未完成”:
  - `.github/workflows/` は `ci.yml` のみで、Release 用 workflow がない
  - `scripts/install.sh` は `deno compile` によるローカルインストールのみ
  - `deno.json` の `cli:build`
    はマニフェスト生成で、バイナリ生成（compile）自体は含まれていない（`scripts/build_cli.ts`
    が artifacts の存在を要求）
- バージョン表現に不整合がある:
  - CLI で表示する storyteller バージョンが `src/cli/modules/version.ts` /
    `src/cli/modules/update.ts` で `0.3.0`
  - 一方でマニフェスト（スキーマ）用らしき `CURRENT_VERSION` は
    `src/application/migration_facilitator.ts` で `1.0.0`
  - v1.0 リリースでは “何のバージョンか” を定義し、表現を統一する必要がある

### Phase 5 の成果物（DoD）

- `deno task check`（新設）で以下がすべて通る:
  - `deno fmt --check`
  - `deno lint`
  - `deno task test`（既存）
  - `deno task coverage`（新設・閾値 80% を満たす）
  - `deno task meta:check -- --dir sample/manuscripts --recursive`（既存CI相当）
- CI（PR/Push）で `check` 相当が実行される
- タグ（例: `v1.0.0`）で Release 用 workflow が走り、成果物が作成される
- README / docs が “実際のコマンド/出力/インストール” と一致する

## 生成AIの学習用コンテキスト

### ロードマップ/要求

- `ISSUE.md`
  - Phase 5 の定義（パフォーマンス/80%/ドキュメント/CI/CD/v1.0）
- `AGENTS.md`
  - Issue #9 のロードマップ詳細（Phase 5 の目的・位置づけ）
- `AGENT.md`
  - ロードマップ要約（Phase 5: 仕上げ）

### CI/CD

- `.github/workflows/ci.yml`
  - 現状 Deno v1.x / `deno task test` / `deno task meta:check` のみ

### カバレッジ/テスト

- `deno.json`
  - タスク定義（coverage/check が未整備）
- `tests/application/meta/binding_loader_test.ts`
  - `test_output/` を削除するため coverage レポート生成に影響し得る
- `tests/deno_tasks_test.ts`
  - タスク定義をテストする既存パターン

### パフォーマンス候補（ホットパス）

- `src/application/meta/meta_generator_service.ts`
  - `generateFromMarkdown` が `ReferenceDetector.detect()` を呼ぶ
- `src/application/meta/reference_detector.ts`
  - `detect()` 内で `loadEntities()` が毎回 `import(toFileUrl(...))`
    を行う（複数章処理のボトルネック候補）
- `src/cli/modules/meta/check.ts`
  - 複数ファイル処理で `generateFromMarkdown(..., dryRun)` を順次呼ぶ

### 配布/バージョン

- `scripts/install.sh`
- `scripts/build_cli.ts`
- `src/cli/modules/version.ts`
- `src/cli/modules/update.ts`
- `src/application/migration_facilitator.ts`

## Process

### process1 カバレッジ計測の安定化（80%判定の前提づくり）

#### sub1 `deno task coverage` を新設し、raw-data-only で収集→レポート生成する

@target: `deno.json` @ref: `deno test --help`（`--coverage-raw-data-only`）,
`deno coverage --help`, `tests/deno_tasks_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/deno_tasks_test.ts`

- [x] `deno.json` に
      `coverage`（および必要な関連タスク）が存在することを検証するテストを追加（現状は未定義のため失敗する）
  - `coverage` が `deno test --coverage ... --coverage-raw-data-only` を含む
  - `coverage` が `deno coverage ...` を含む（レポート生成）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `deno.json` に以下のタスクを追加
  - `fmt:check`: `deno fmt --check`
  - `lint`: `deno lint`
  - `coverage`: raw-data-only で収集→ `deno coverage` でレポート生成
  - Optional: `check`:
    `deno task fmt:check && deno task lint && deno task coverage && deno task test && deno task meta:check ...`
- [x] `coverage` の include/exclude 方針を固定
  - include: `src/` のみ（例: `--include="^file:.*?/street-storyteller/src/"`）
  - exclude: `test_output/` や `sample/` を除外（例:
    `--exclude="test_output/|/sample/"`）
  - 目的: テストが生成する一時 TS モジュール（`test_output/.../*.ts`）を
    coverage レポート対象外にして安定化する

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter deno.json`
      などで該当テストを実行し、通過することを確認
- [x] `deno task coverage` を実行し、レポート生成まで完走することを確認
- [x] 必要に応じてタスク名/責務を整理（例: `coverage:collect` と
      `coverage:report` に分割）

#### sub2 カバレッジ閾値（80%）を機械的に判定する仕組みを追加する

@target: `scripts/coverage_threshold.ts` @ref: `deno coverage --help`,
`tests/`（既存タスクテスト方針）, `ISSUE.md`（80%要求）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/coverage_threshold_test.ts`

- [x] `deno coverage` の出力テキスト（サンプル）から "総合カバレッジ%"
      を抽出する関数のテストを作成（未実装のため失敗）
  - 例: `parseCoveragePercent(output: string): number`
  - 例外系: パースできない場合はエラー
- [x] `80%` 未満で失敗することを検証する（閾値チェック）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `scripts/coverage_threshold.ts` を追加
  - `deno coverage` を `Deno.Command` で実行し、stdout から % をパース
  - 閾値（デフォルト 80%）未満なら exit code 1
  - include/exclude は process1 と一致させる
- [x] `deno.json` の `coverage` タスク末尾で `scripts/coverage_threshold.ts`
      を呼ぶ（もしくは `coverage:check` を新設）

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter coverage_threshold` を実行し、通過を確認
- [x] `deno task coverage` 実行で、閾値判定まで含めて安定動作することを確認

#### sub3 “カバレッジ収集時にレポート生成で落ちる” 問題の再発防止

@target: `deno.json` @ref:
`tests/application/meta/binding_loader_test.ts`（test_output削除）,
`deno test --help`（raw-data-only）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/coverage_smoke_test.ts`

- [x] `scripts/coverage_threshold.ts` を
      `--dry-run`（実行せずパースのみ）等で呼べるようにし、coverageレポート出力の想定形式を固定するテストを追加（未実装なら失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `scripts/coverage_threshold.ts` に
      `--input <file>`（事前に保存した出力を読む）などのモードを追加して、CI/ローカルで安定テスト可能にする
- [x] `deno test`
      用の一時ディレクトリ削除ポリシーは維持しつつ、coverageレポート生成が失敗しない構成（raw-data-only +
      exclude）を固定する

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter coverage_smoke` を実行し通過
- [x] `deno task coverage` で完走を再確認

---

### process2 CI を Deno 2 + 品質ゲート（fmt/lint/coverage）へ更新する

#### sub1 CI workflow を Deno v2.x に統一する

@target: `.github/workflows/ci.yml` @ref: `.github/workflows/ci.yml`,
`deno.json`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/ci_workflow_test.ts`

- [x] `.github/workflows/ci.yml` を読み、`deno-version` が `v2`
      系であることを検証するテストを追加（現状 `v1.x` のため失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `.github/workflows/ci.yml` の `deno-version` を `v2.x` に変更

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter ci_workflow` を実行し通過
- [x] Optional: CI 実行ログで `deno task test` が走ることを確認（手動）

#### sub2 CI に fmt/lint/coverage を追加し、Phase 5 の DoD を自動判定する

@target: `.github/workflows/ci.yml` @ref:
`deno.json`（process1で追加するタスク）, `.github/workflows/ci.yml`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/ci_workflow_test.ts`

- [x] CI workflow に `deno fmt --check` / `deno lint` / `deno task coverage`
      が含まれることを検証するテストを追加（現状は含まれないため失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `.github/workflows/ci.yml` に以下を追加
  - `deno fmt --check`
  - `deno lint`
  - `deno task coverage`（80%閾値チェック込み）
  - `deno task meta:check -- --dir sample/manuscripts --recursive`（現状維持）

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter ci_workflow` が通ることを確認
- [x] Optional: CI 実行時間を見て、重い場合は `test` と `coverage`
      の二重実行を避ける（`coverage` が `test` を内包する設計にする等）

---

### process3 リリース（CI/CD）と配布経路を整備する（v1.0.0）

#### sub1 CLI パッケージングタスクを “ビルド込み” に整理する

@target: `deno.json` @ref: `scripts/build_cli.ts`,
`scripts/generate_completions.ts`, `tests/deno_tasks_test.ts`,
`tests/install_script_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/deno_tasks_test.ts`

- [x] `cli:package` が "compile（バイナリ生成）→ manifest → completions"
      の順序を含むことを検証するテストを追加（現状はcompileが含まれず失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `deno.json` を整理（例）
  - `cli:compile`: `deno compile ... --output dist/storyteller main.ts`
  - `cli:manifest`:
    `deno run scripts/build_cli.ts --out dist --artifacts dist/storyteller`
  - `cli:completions`: 現状維持（`dist/completions`）
  - `cli:package`: `cli:compile && cli:manifest && cli:completions`

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter deno.json` 通過
- [x] Optional: `deno task cli:package` をローカルで実行し、`dist/`
      に成果物が揃うことを確認（手動）

#### sub2 タグ push で Release を作る workflow を追加する

@target: `.github/workflows/release.yml` @ref: `.github/workflows/ci.yml`,
`deno.json`, `scripts/install.sh`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/release_workflow_test.ts`

- [x] `.github/workflows/release.yml` が存在し、tag トリガー（例:
      `v*.*.*`）を持つことを検証するテストを作成（未作成のため失敗）
- [x] workflow が
      `deno task cli:package`（または同等）を実行することを検証（未作成のため失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `.github/workflows/release.yml` を追加
  - tag トリガー: `v*.*.*`
  - matrix（任意）: linux/mac/windows で `deno compile` して成果物を添付
  - `dist/storyteller-manifest.json` と `dist/completions/*` も Release に添付
  - Release Notes は最小で良い（v1.0.0 の破壊的変更/既知の制限/移行を記載）

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter release_workflow` 通過
- [x] Optional: GitHub 上で draft
      リリースを手動トリガーして成果物が付くことを確認

---

### process4 バージョン表現の統一（v1.0.0 リリース準備）

#### sub1 “何のバージョンか” を分離し、定数を一箇所に集約する

@target: `src/core/version.ts` @ref: `src/cli/modules/version.ts`,
`src/cli/modules/update.ts`, `src/application/migration_facilitator.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/version_constants_test.ts`

- [x] storyteller の "アプリバージョン" と "プロジェクトスキーマバージョン"
      が混在しないことを検証するテストを追加（集約前は失敗する）
  - 例: `STORYTELLER_VERSION` と `PROJECT_SCHEMA_VERSION`
    を別名で定義し、それぞれ参照箇所が適切であること

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `src/core/version.ts` を追加し、以下を定義
  - `export const STORYTELLER_VERSION = "0.3.0"`（Phase 5 中に `1.0.0` へ）
  - `export const PROJECT_SCHEMA_VERSION = "1.0.0"`（manifest/migration 用）
- [x] `src/cli/modules/version.ts` / `src/cli/modules/update.ts`
      のバージョン表示は `STORYTELLER_VERSION` を参照するよう修正
- [x] `src/application/migration_facilitator.ts` の `CURRENT_VERSION` は
      `PROJECT_SCHEMA_VERSION` を参照するよう修正

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter version_constants` を実行し通過
- [x] Optional: `deno run main.ts version` で表示が期待通りか確認（手動）

#### sub2 v1.0.0 への移行タイミングを固定する

@target: `src/core/version.ts` @ref: `ISSUE.md`（Phase 5 v1.0）,
`AGENTS.md`（Issue #9）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/version_release_ready_test.ts`

- [x] `STORYTELLER_VERSION` が `1.0.0` のとき、Release workflow / install.sh /
      manifest が矛盾しないことを検証（未整備なら失敗）

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `STORYTELLER_VERSION` を `1.0.0` に更新する PR を Phase 5
      最終日にまとめる（RC を挟むなら `1.0.0-rc.1` も検討）
- [x] `scripts/build_cli.ts` の `--version` 引数に `STORYTELLER_VERSION`
      を渡す経路を確立（CI/Release workflow 側で渡す）

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter version_release_ready` 通過
- [x] Optional: tag `v1.0.0-rc.1` で Release workflow を試走

---

### process5 パフォーマンス最適化（計測→改善→退行防止）

#### sub1 ベンチマークを追加し、最適化対象を可視化する

@target: `bench/meta_check_bench.ts` @ref: `src/cli/modules/meta/check.ts`,
`src/application/meta/meta_generator_service.ts`,
`src/application/meta/reference_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/bench_task_test.ts`

- [x] `deno.json` に `bench`
      タスクが存在することを検証するテストを作成（未定義なら失敗）
  - 例: `deno bench -A bench/` を呼ぶ

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `bench/` を追加し、最低 1 本のベンチを作る
  - `MetaGeneratorService.generateFromMarkdown(..., dryRun)`
    を複数回呼び、処理時間を測る
  - ベンチ用の最小プロジェクト（`Deno.makeTempDir` + `src/characters` +
    `src/settings` + manuscripts）を組み立てる
- [x] `deno.json` に `bench` タスクを追加

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter bench_task` 通過
- [x] `deno task bench` を実行し、ベンチが動くことを確認（手動）

#### sub2 `ReferenceDetector` のエンティティロードをキャッシュし、複数章処理を高速化する

@target: `src/application/meta/reference_detector.ts` @ref:
`src/application/meta/meta_generator_service.ts`,
`src/cli/modules/meta/check.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/meta/reference_detector_cache_test.ts`

- [x] 同一 `projectPath` に対して `detect()`
      を連続実行した場合、エンティティロード（`loadEntities` 相当）が 1
      回に抑えられることを検証するテストを追加（未実装のため失敗）
  - 実装方針: `ReferenceDetector` に loader
    を注入可能にし、呼び出し回数をカウントできるようにする

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `ReferenceDetector` に `EntityLoader`（または `loadEntities`
      の差し替え）を注入できる構造に変更
- [x] `projectPath` + kind（character/setting）単位でロード結果をメモ化
- [x] watch/serve/LSP
      のように変更検知が必要な場面のために、キャッシュ無効化フック（任意）を用意

##### TDD Step 3: Refactor & Verify

- [x] `deno test --filter reference_detector_cache` 通過
- [x] `deno task meta:check -- --dir sample/manuscripts --recursive`
      で体感速度が落ちていないことを確認（手動）

---

### process10 ユニットテスト（追加・統合テスト）

- [x] coverage レポートで未カバーの "落ちやすい枝" を優先して追加
  - CLI: 引数不正/ファイル I/O 失敗/互換性エラーの分岐
  - meta: frontmatter エラー・unknown reference エラー
  - view/serve: 監視/サーバーの起動停止（既存テストの補強）
- [x] 追加テストは `coverage` の include（src/）に乗る範囲を優先

---

### process200 ドキュメンテーション

- [x] `README.md` を "現状のインストール/コマンド" に一致させる
  - `scripts/install.sh` の使い方
  - `deno task build` / `deno task cli:package` の推奨手順
  - `storyteller meta check` / `meta generate` / `view` / `lsp` / `update` /
    `version`
- [x] `docs/` の更新
  - `docs/meta-generate.md`: `--preset` / `--update` / `--force`
    などの現仕様と差分がないか確認
  - `docs/lsp-implementation.md`: install 生成物/起動方法が現実と一致するか確認
  - `docs/mcp.md`: exposed tools/resources と CLI の整合
- [x] Release Notes テンプレの作成（`docs/release-notes.md` など）
