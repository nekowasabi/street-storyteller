# Clarity 実装の記録（2026-11-07）

`verify-clarity-impl` の項目を順に実装した記録。各行は「何を変え、何で確かめ、結果はどうか」。

| 単位 | 変えたもの | 確かめ方 | 結果 |
|---|---|---|---|
| V1 | `internal/domain/proposition.go`、`src/type/v2/proposition.ts`、`loader.go` に `LoadProposition` / `mapProposition`、`store.go` に `props`、`manifest.go` に `Propositions`（既定 `src/propositions`）、`project.go` に walker | `go test ./internal/project/... ./internal/domain/...` | 281 件通過。`authorTruth: null` は `*bool` nil。`resolutionPolicy: "keep"` は validation エラー |
| V3 | `internal/domain/clarity.go`。`命題ID:態度` と `命題ID` の解釈 | `go test ./internal/domain/` | 通過 |
| V2 | `internal/meta/frontmatter.go` に `reader_shows` / `reader_requires`（読み・書き・空判定）、`manuscript_binding` の entityType と事前検証 | `go test ./internal/meta/... ./internal/mcp/tools/...` | 393 件通過。列の順序が Encode で保たれる |
| V4 | `internal/service/reader_prereq.go`、テストデータ「雨夜の鍵」 | `go test ./internal/service/` | 20 件通過。壊し版 6 通りが TLA+ の表と一致 |
| V5 | `MetaCheckService.Run` が Clarity を足す。CLI は `PresentMetaCheck` で違反行と終了コード 1、MCP は isError | CLI / MCP テスト、実バイナリ | 311 件通過。実バイナリで壊し版が落ちる |
| V6 | `internal/cli/modules/manuscript/build.go`。`drafts/` を検査して `manuscripts/` に写す | `go test ./internal/cli/...`、実バイナリ | 308 件通過。落ちたら 1 ファイルも書かない |
| V7 | `textDocument/completion`。frontmatter の `reader_*` で命題 ID と態度 | `go test ./internal/lsp/...` | 78 件通過。golden を更新 |
| V8 | サンプル cinderella に命題 1 つと宣言、文書 4 本、スキル 5 本 | `go run ./cmd/storyteller meta check --path samples/cinderella/manuscripts` | `4 files validated`。開示を消した写しは RDR-102 で落ちる |
| 全体 | | `go test ./...`、`go vet`、`gofmt -l` | 1167 件通過、警告なし、未整形なし |

## 判断

- V3 を V2 より先に実装する。`manuscript_binding` の ID 検証が `命題ID:態度` の解釈に依存するため。
- `authorTruth` は必須にし、未定は `null` で書く。省略を未定と読むと、書き忘れと区別できない。
- RDR-104 は `resolutionPolicy` だけを見る（`authorTruth` を読まない）。TLA+ モデルと同じ判定にして、設計と実装の一致を壊し版の表で確かめられるようにした。`authorTruth` を読む判定に変えるときは、モデルと表を先に直す。
- `meta check` の project root は `manuscripts/` の親ディレクトリ。manifest が無ければ命題の存在確認（RDR-101）だけを飛ばし、順序の規則は走らせる。manifest はあるが読めない（壊れた `.ts` など）ときは検査自体を落とす。読めないプロジェクトを静かに通すと、ゲートが見かけより緩くなるため（`lsp/server.LoadCatalog` と同じ立場）。
- `manuscript build` は frontmatter を持たない `.md`（`drafts/ideas.md`）を写さない。原稿とメモを同じディレクトリに置く既存の雛形に合わせた。
- 行番号は frontmatter 解析器が持たないので、違反した文字列をファイル内で最初に見つけた行にした。同じ文字列が 2 回出る場合は最初の行を指す。
- LSP 補完の候補は `ServerOptions.Propositions` で渡す。`initialize` の rootUri から再読み込みするときも同じ経路で更新する。

## 自分がしていない変更

作業中の `git status` に `PLAN-lsp-pragmatize.md`、`PLAN-sync-skills.md`、`plan-sync-skills/` の削除が出ているが、この作業では触れていない。別の操作による削除とみられ、復元も追加の削除もしていない。
