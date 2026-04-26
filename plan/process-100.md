# Process 100: 品質ゲートとCI設計

## Overview

Go移行後の品質ゲートを設計し、速いユニットテストと遅い統合/外部依存テストを明確に分ける。

## Affected Files

- `deno.json:5` - 現行 task と品質ゲート
- `.github/workflows/*` - CI が存在する場合の更新対象
- `scripts/coverage_threshold.ts` - 現行 coverage gate の参考
- `docs/migration/go-rearchitecture-requirements.md:195` - 推奨テスト階層
- `PLAN.md` - Overall 進捗更新対象

## Implementation Notes

- CI は最小でも次を分ける。
  - `go test ./...` default fast tests
  - `go test -tags=integration ./...`
  - `go test -tags=external ./...` は手動/夜間/明示条件
  - `deno task test` は移行期間の互換ゲートとして残すが、長時間群を分離する
- coverage は Go と Deno で別集計にする。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認 → TestCIWorkflowHas5Jobs
- [x] CI定義が存在しない/古い場合に失敗するチェックを作る →
      TestCIWorkflowHas5Jobs, TestCIExternalJobEmitsMachineDetectableSkip
- [x] default test で external tag が混入したら失敗するチェックを作る →
      TestCIDefaultJobExcludesExternalTag
- [x] テストを実行して失敗することを確認 → TestDenoJsonHasGoTasks,
      TestGoCoverageScriptIsExecutable

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] Go用 test/lint/build task を追加 → deno.json
- [x] integration/external test の実行経路を分離 → .github/workflows/ci.yml
- [x] coverage の閾値方針を決める → scripts/go_coverage.sh
- [x] CI workflow を更新 → .github/workflows/ci.yml
- [x] テストを実行して成功することを確認 → internal/testkit/ci_test.go,
      internal/testkit/build_tags_test.go

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] ローカル開発用の短いコマンド名を追加 → deno.json (`go:test`,
      `go:test:integration`, `go:test:external`, `go:coverage`)
- [x] CI失敗時のログを読みやすくする → .github/workflows/ci.yml
      (`EXTERNAL_SKIP_REASON=` log emit)
- [x] テストが継続して成功することを確認 → `go test ./... -count=1`,
      `bash scripts/go_coverage.sh`

✅ **Phase Complete**

---

## Implementation Summary (Process-100 完了)

### 追加ファイル

- `internal/testkit/ci_test.go` — CI workflow 構造検証 (3 tests)
- `internal/testkit/build_tags_test.go` — deno task/coverage script 検証 (2
  tests)
- `scripts/go_coverage.sh` — coverage gate 実装
- `internal/external/textlint/worker_external_test.go` — external tag テスト雛形

### 変更ファイル

- `.github/workflows/ci.yml` — 5-job 構造
  (lint/test/integration/external/coverage)
- `deno.json` — `go:test`, `go:test:integration`, `go:test:external`,
  `go:coverage` 4 task 追加

### test 階層設計

- default (`go test ./...`): 高速 unit、外部コマンドなし
- `integration` tag: サーバー/transport 結合
- `external` tag: textlint/digrag 等の外部依存。`workflow_dispatch` または
  commit message に `[external]` を含む push 時のみ実行
- coverage gate: `internal/testkit/clock` のみ 70% 強制、他 package は WARN-ONLY
  (Process-101 以降で段階導入)

### machine-detectable skip 契約

external job/test は依存未検出時に `EXTERNAL_SKIP_REASON=<reason>` 形式で log を
emit する。CI ログ grep で skip 理由を機械的に判定できる。

### 検証コマンド (PARENT-VERIFY-GREEN)

- `go test ./... -count=1`
- `go test -tags=integration ./... -count=1`
- `go test -tags=external ./internal/external/textlint/... -v -count=1 2>&1 | grep -E '(EXTERNAL_SKIP_REASON=|--- SKIP:)'`
- `bash scripts/go_coverage.sh`

---

## Dependencies

- Requires: 4, 5, 10, 11
- Blocks: 200
