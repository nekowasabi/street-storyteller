# Process 01-13 Verification Result

> **Status: 全 Process 完了 (19/19) — 2026-04-27**
>
> 本ドキュメントは Process 01-13 時点の中間検証履歴。
> Process 50 / 100 / 101 / 200 / 201 / 300 を含む全体振り返りは
> [docs/go-migration-retrospective.md](docs/go-migration-retrospective.md)
> を参照すること。本ファイルは履歴記録として保存。

検証日: 2026-04-26

## 結論

`process-01.md` から `process-13.md` までを計画と実装で照合した。Go
側ユニットテスト、Deno authoring テスト、クロスビルド smoke は成功している。

ただし、`PLAN.md` 上の「13/13 completed」は現状では過大評価。特に Process 05,
06, 08, 09, 13
は、テストが通っていても実装範囲が計画の完了条件に届いていない箇所がある。

## 今回修正した不足

- `deno.json`
  - 旧 Deno E2E/広範囲テストタスクを削除。
  - `test` は `test:authoring` のみに限定。
  - `build` は Go バイナリ用 `scripts/build.sh` に変更。
  - `coverage` は Go coverage に寄せた。
- `docs/test-cleanup-list.md`
  - Deno formatter に合わせて整形。

## 検証コマンド

| Command                                                                                                                                        | Result | Notes                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| `env GOCACHE=/tmp/street-storyteller-go-cache go test ./... -count=1`                                                                          | PASS   | Go ユニットテスト全件成功            |
| `deno task test:authoring`                                                                                                                     | PASS   | Deno authoring surface テスト成功    |
| `deno lint tests/authoring/ src/type/ src/characters/ src/settings/ src/timelines/ src/foreshadowings/`                                        | PASS   | authoring 対象の lint 成功           |
| `deno fmt --check deno.json docs/test-cleanup-list.md internal/testkit/process05_13_guard_test.go tests/authoring/authoring_surface_test.ts`   | PASS   | 対象ファイル整形済み                 |
| `go mod verify`                                                                                                                                | PASS   | 外部 Go 依存なし、module verify 成功 |
| `env GOCACHE=/tmp/street-storyteller-go-cache GOMODCACHE=/tmp/street-storyteller-go-mod go build ./...`                                        | PASS   | Go build 成功                        |
| `env GOCACHE=/tmp/street-storyteller-go-cache GOMODCACHE=/tmp/street-storyteller-go-mod OUT_DIR=/tmp/street-storyteller-dist scripts/build.sh` | PASS   | 5 ターゲットのクロスビルド成功       |
| `scripts/check_binary.sh /tmp/street-storyteller-dist/linux_amd64/storyteller`                                                                 | PASS   | 2,662,562 bytes、50MB 未満           |

通常の `go test ./...` / `go build ./...` は、この環境では
`/home/takets/.cache/go-build` が read-only
のため失敗する。コード不良ではないため、検証では `GOCACHE=/tmp/...` を指定した。

## Process 別判定

| Process              | 判定         | 根拠                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 憲章化            | OK           | `CLAUDE.md`, `docs/architecture.md`, guard test が存在。                                                                                                                                                                                                                                |
| 02 tsparse 拡張      | OK           | `internal/project/tsparse/preprocess.go` と parser tests が存在し、対象テスト成功。                                                                                                                                                                                                     |
| 03 棚卸し            | OK           | `docs/go-migration-inventory.md`, `scripts/inventory.sh`, inventory guard が存在。                                                                                                                                                                                                      |
| 04 CLI Go 移植       | Mostly OK    | `generate/element/update/view` の Go module と registry/golden tests が存在。Go 全件テスト成功。                                                                                                                                                                                        |
| 05 LSP Go 移植       | PARTIAL      | LSP server/provider/diagnostics はあるが、`lsp validate` は stub と明記されている。`textsync` は full sync で、計画の rope/piece-table 化は未実装。                                                                                                                                     |
| 06 MCP Go 移植       | PARTIAL      | server/tools/resources/prompts はあるが、tools は `meta_check`, `lsp_validate`, `view_browser` 中心。計画にある `meta_generate`, `element_create`, `lsp_find_references`, timeline/subplot 系 tool は未実装。resources/prompts も list/parse 相当で、詳細取得や schema 自動生成は未完。 |
| 07 RAG 廃止          | OK           | `internal/rag` は存在せず、CLI registry と `deno.json` に RAG task はない。                                                                                                                                                                                                             |
| 08 textlint adapter  | PARTIAL      | parser/worker はあるが、計画にある `config.go`, `availability.go`, cache 層は未確認または未実装。`lint` CLI は現在 `lint passed` の簡易実装。                                                                                                                                           |
| 09 TS runtime retire | NOT COMPLETE | `src/cli/modules`, `src/lsp`, `src/mcp`, `src/rag`, `src/cli.ts` は削除済みだが、計画で削除対象の `src/application`, `src/infrastructure`, `src/plugins`, `src/llm`, `src/commands`, 旧 TS テスト群が残っている。                                                                       |
| 10 CI 整理           | OK after fix | CI は Go default test + Deno authoring test 構成。`deno.json` も今回 authoring 中心に修正。                                                                                                                                                                                             |
| 11 go.mod 整理       | OK           | `go list -m all` は main module のみ。`go mod verify` 成功。                                                                                                                                                                                                                            |
| 12 バイナリ検証      | OK           | `scripts/build.sh` で 5 ターゲット build 成功。linux/amd64 smoke 成功、50MB 未満。                                                                                                                                                                                                      |
| 13 E2E 棚卸し・削除  | PARTIAL      | CI/deno task からは外れているが、`tests/lsp`, `tests/mcp`, `tests/rag`, `tests/scenario`, `tests/integration` など旧 TS テストファイルは残存。                                                                                                                                          |

## 重要な残課題

1. Process 05/06/08 の「completed」表記を見直すか、未実装機能を実装する。
   - 現状は MVP/stub
     としてはテスト成功しているが、計画本文の完了条件とは一致していない。
2. Process 09/13 の retire 方針を完遂する。
   - `src/application`, `src/infrastructure`, `src/plugins`, `src/llm`,
     `src/commands` の削除可否を決める。
   - 旧 TS tests を削除または `tests/legacy/` に隔離する。
3. user-facing docs の RAG / `deno compile` 記述を整理する。
   - `README.md` と `CLAUDE.md` に `storyteller rag ...` と `deno compile`
     の古い記述が残っている。
   - Process 200/201 の範囲だが、Process 07/12 の方針とは矛盾して見える。

## 最終判定

ユニットテスト全件は成功している。ただし、process-01 から process-13
までを「実装完了」とみなすには未完了項目が残る。現時点では「Go MVP のテストは
green、計画完遂は partial」が正確な状態。
