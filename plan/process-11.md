# Process 11: 遅いテストの隔離とtestkit整備

## Overview

現行で長時間化した LSP/textlint/file watching
テストを通常ユニットから分離し、Go版では fake clock/process/transport
で高速に検証できる testkit を用意する。

## Affected Files

- `docs/migration/go-rearchitecture-requirements.md:203` - 長時間テストの記録
- `src/lsp/server/server.ts:178` - 実時間 debounce
- `src/lsp/server/server.ts:760` - file watching debounce
- `src/lsp/integration/textlint/textlint_worker.ts:55` - setTimeout debounce
- `src/lsp/integration/textlint/textlint_worker.ts:101` - `npx textlint` 実行
- `tests/lsp/server/server_file_watching_test.ts` - 長時間化対象
- `tests/lsp/integration/textlint/*` - 長時間化対象

## Implementation Notes

- Go 配置案:
  - `internal/testkit/clock`
  - `internal/testkit/process`
  - `internal/testkit/transport`
- テストタグ:
  - default: 外部コマンドなし、高速
  - `integration`: サーバー/transport 結合
  - `external`: textlint/digrag/git/npm/deno
- fake clock で debounce を即時進行できるようにする。

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] 実時間 sleep を使うテストを禁止する lint/check を作る
- [x] fake clock 未実装で失敗する debounce テストを作る
- [x] 外部コマンドを default test で呼ぶと失敗する guard を作る
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] Clock/Timer interface を追加
- [x] fake clock を実装
- [x] ProcessRunner interface と fake runner を実装
- [x] in-memory JSON-RPC transport を実装
- [x] test tag を設定
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] testkit を LSP/MCP/CLI で共通利用できる形に整理
- [x] 長時間テストの一覧と移行状況を更新
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Implementation Summary (Process-11 完了)

### 追加ファイル

- `internal/testkit/clock/timer.go` — `Stopper`, `Timer` interface 定義
- `internal/testkit/clock/fake_timer.go` — `(*FakeClock).AfterFunc` +
  `fakeTimer`/`fakeTimerHandle` 実装
- `internal/testkit/clock/timer_test.go` —
  `TestFakeTimerAfterFuncFiresAfterAdvance` 等 5 テスト
- `internal/testkit/lint_test.go` — `TestNoTimeSleepInDefaultTests` (AST walker,
  default-tag tests に `time.Sleep` 禁止)
- `internal/testkit/guard_test.go` — `TestNoOsExecImportInDefaultTests` (AST
  walker, default-tag tests に `os/exec` import 禁止)

### 変更ファイル

- `internal/testkit/clock/clock.go` — `FakeClock.pendingTimers` フィールド追加 +
  `Advance`/`Set` から `fireDueTimers()` 呼出

### test tag 設計

- `go test ./...` (default): 全テスト高速、外部コマンドなし、実時間 sleep なし
- `go test -tags=integration ./...`: サーバー/transport 結合テスト (将来追加)
- `go test -tags=external ./...`: textlint/digrag/git/npm/deno 依存 (将来追加)

`internal/testkit/lint_test.go` と `guard_test.go` は `//go:build`
を確認し、`integration`/`external` タグの付いたファイルは違反対象から除外する。

### 高速化見込み

TS版で 15分超かかっていた LSP E2E / textlint / file watching が、testkit
を活用することで Go 版では 1 秒未満に短縮可能 (詳細は
`docs/migration/go-rearchitecture-requirements.md`)。

---

## Dependencies

- Requires: 1
- Blocks: 5, 100
