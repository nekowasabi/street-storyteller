---
name: verify-clarity-impl
description: Clarity（わかりやすさ）の実装（Proposition の要素種別、原稿 frontmatter の reader_shows / reader_requires、ReaderPrereqService、meta check への組み込み、manuscript build、LSP 補完）を最後まで進めるための検証項目。各単位の「できた」の判定と、設計の TLA+ モデルとの一致を確かめる。Clarity の実装に触れる変更をしたら、コミット前にこのスキルを開き、該当する項目を走らせて結果を引用する。
---

# verify-clarity-impl

設計は `docs/clarity.md`、用語は `docs/glossary.md`、型のスケッチは `docs/designs/reader-prereq-sketch.ts`。設計そのものの検査は `verify-reader-prereq`（TLA+）にあり、このスキルは実装がその設計どおりに動くかを見る。

状態（2026-11-07）: V0 から V8 まで実装し、各項目を走らせて通った（末尾の記録）。V9 はコミットが要るので未了。項目を走らせて通ったら、末尾の記録に日付と結果を書く。走らせていない項目は通ったことにしない。

## 決めたこと（実装の前提）

- frontmatter の書式は文字列リスト。`reader_shows: ["loc:shown", "hist:withheld"]`、`reader_requires: ["loc:shown", "hist"]`。`命題ID:態度` で、`reader_requires` の態度なしは命題 ID だけ。既存の frontmatter 解析（`internal/meta/frontmatter.go`、スカラーと文字列リスト）を変えない。
- 章の順序は `manuscripts/` のファイル名順。frontmatter の `order` 欄は使わない。
- 出口は 2 つ。`storyteller meta check` が `manuscripts/` に Clarity 検査を足し、落ちたら終了コード 1。`storyteller manuscript build` が `drafts/` を検査して `manuscripts/` に写し、落ちたら写さない。
- 落ちたときの出力は違反ごとに 1 行 `ファイル:行 RDR-10x 説明`。`--json` では既存の `{type:"error", ...}` に違反の配列を入れる。
- LSP で `reader_shows` / `reader_requires` の値（命題 ID と態度）を補完できる。今の LSP に補完は無いので、新しい機能になる。

## 守る性質と、破れたときの害

- **P1 前提は先に渡す（RDR-102）**: 章の `reader_requires` の各項目は、ファイル名順でより前の章の `reader_shows` に在る。態度なしは何らかの態度（`withheld` を含む）で足りる。
  害: 読者が受け取っていない事実に場面が寄りかかり、「分からない」で読みが止まる。
- **P2 訂正は誤信のあと（RDR-103）**: `corrected` は、同じ命題の `misled` が前の章か同じ章の列でより前に在る。
  害: 誤信していないものを訂正しても読者に何も起きない。
- **P3 偽の命題は最後までに訂正する（RDR-104）**: `must-correct-if-false` の命題は最終章で `corrected`。
  害: 正すと決めた誤信が残って終わる。
- **P4 参照は存在する（RDR-101）**: frontmatter の命題 ID は `src/propositions/` に在り、態度は 6 値のどれか。
  害: 綴りの誤りが検査をすり抜ける。
- **P5 ゲートは写さない**: `manuscript build` は P1 から P4 のどれかが落ちたら 1 ファイルも `manuscripts/` に書かない。
  害: 落ちた原稿が提出用に混ざる。

## 項目

各項目は「実装する単位」「確かめ方」「期待する結果」「落ちる形」の 4 つを持つ。落ちる形は、わざと壊して検査が落ちることを一度見るためのもの。見ていない検査は通ったことにしない。

### V0 設計モデル（実装前、実行済み）

- 単位: 無し。`verify-reader-prereq` の TLA+ モデル。
- 確かめ方: `verify-reader-prereq` の走らせ方 1 から 3。
- 期待: 本編は 3 規則成立、別案は RDR-102 が 2 手で破れる。
- 落ちる形: 同スキルの「落ちる検証を見た記録」の 5 通り。
- 記録: 2026-11-07 通った。

### V1 Proposition の型とローダー

- 単位: `src/type/v2/proposition.ts`、`internal/domain/proposition.go`、`internal/project/entity/loader.go` の `LoadProposition` と `mapProposition`、`internal/project/project.go` の種別一覧に `proposition`（dir は manifest の `Paths.Propositions`、既定 `src/propositions`）。
- 確かめ方: `go test ./internal/project/... -run Proposition`。テストは `propositionId` / `statement` / `authorTruth`（true / false / null） / `resolutionPolicy`（3 値）を読み、`src/propositions/` が無いプロジェクトでエラーにならないことを見る。
- 期待: PASS。`authorTruth: null` が Go 側で「未定」として区別できる（`*bool` の nil）。
- 落ちる形: `resolutionPolicy: "keep"` のファイルを読ませて `validationf` のエラーになる。

### V2 frontmatter の 2 欄

- 単位: `internal/meta/frontmatter.go` の `FrontMatter` に `ReaderShows []string` と `ReaderRequires []string`（yaml `reader_shows` / `reader_requires`）。`emitter.go` の書き出し順にも足す。`manuscript_binding` の `entityType` に `reader_shows` / `reader_requires` を足す。
- 確かめ方: `go test ./internal/meta/... ./internal/mcp/tools/... -run 'Reader|Binding'`。
- 期待: 読み書きで値と順序が保たれる（列の順が提示順なので、並べ替えてはいけない）。`manuscript_binding` の add / remove / set が動く。
- 落ちる形: emitter が `reader_shows` をソートするように変えると、順序のテストが落ちる。

### V3 文字列の解釈

- 単位: `internal/domain/clarity.go`（名前は仮）の `ParseDisclosure("loc:shown")` と `ParseRequirement("hist")`。
- 確かめ方: `go test ./internal/domain/... -run Clarity`。
- 期待: `loc:shown` が命題 `loc`、態度 `shown`。`hist` が命題 `hist`、態度 nil。`loc:believed` は態度が 6 値に無いのでエラー。`:shown` と `loc:` はエラー。
- 落ちる形: 態度の表を 1 つ消すとエラーのテストが落ちる。

### V4 ReaderPrereqService（P1 から P4）

- 単位: `internal/service/reader_prereq.go` の `ReaderPrereqService.Run(root)`。`manuscripts/` を深さ 1 でファイル名順に走査し、違反を `[]ClarityViolation{File, Line, Code, Message}` で返す。
- 確かめ方: `go test ./internal/service/... -run ReaderPrereq`。テストデータは `internal/service/testdata/clarity_rainkey/`（「雨夜の鍵」。`src/propositions/` に 3 命題、`manuscripts/chapter01.md` から `chapter04.md`）と、その壊し版 5 つ。
- 期待: 本編は違反 0。壊し版は次の 1 件ずつ。これは `verify-reader-prereq` の「落ちる検証を見た記録」と同じ表で、TLA+ の結果と Go の結果が一致することが設計と実装の一致の根拠になる。

| 壊し版 | 期待する違反 |
|---|---|
| `chapter02.md` の `reader_shows` を空にする | RDR-102 `chapter03.md` 命題 `loc` の前提 `shown` が前に無い。同時に `hist` の前提も無いので 2 件 |
| `chapter04.md` の `loc:misled` を消す | RDR-103 `chapter04.md` |
| `chapter04.md` の `loc:corrected` を消す | RDR-104 `chapter04.md` 命題 `loc` |
| `chapter04.md` の列を `loc:corrected, loc:misled` に逆転する | RDR-103 と RDR-104 の 2 件 |
| `chapter02.md` の `hist:withheld` を消す | RDR-102 `chapter03.md` 命題 `hist` |

- 加えて: 存在しない命題 ID `key:shown` で RDR-101。`src/propositions/` が無いプロジェクトで `reader_shows` も無ければ違反 0 でスキップ。
- 落ちる形: 上の表そのもの。

### V5 meta check への組み込み（出口 1）

- 単位: `internal/service/meta_check.go` の `Run` が `ReaderPrereqService` を呼ぶ。`internal/cli/modules/meta/check.go` と `internal/mcp/tools/meta_check.go` が違反を出力する。
- 確かめ方: `go test ./internal/cli/modules/meta/... ./internal/mcp/tools/... -run MetaCheck`。加えて `make build` のあと `storyteller meta check --path internal/service/testdata/clarity_rainkey_break1` を手で走らせる。
- 期待: 本編で終了コード 0。壊し版 1 で終了コード 1、標準出力に `manuscripts/chapter03.md:N RDR-102 命題 loc の前提 shown が前に無い` の形の行。`--json` で `{"type":"error", "violations":[{"file":..., "line":..., "code":"RDR-102", ...}]}`。MCP の `meta_check` も同じ違反を返す。
- 落ちる形: 壊し版 1。

### V6 manuscript build（出口 2）

- 単位: `internal/cli/modules/manuscript/build.go`（新規）。`drafts/` を V4 と既存の `meta check` で検査し、通れば `manuscripts/` に写す。
- 確かめ方: `go test ./internal/cli/modules/manuscript/...`。一時ディレクトリに `drafts/` を作り、通る場合と落ちる場合を見る。
- 期待: 通る場合は `manuscripts/` に同名ファイルができ、中身が一致。落ちる場合は終了コード 1 で `manuscripts/` に 1 ファイルも増えない（P5）。
- 落ちる形: 壊し版 1 を `drafts/` に置く。

### V7 LSP 補完

- 単位: `internal/lsp/server/` に `textDocument/completion`。frontmatter の `reader_shows` / `reader_requires` の行で、命題 ID（`src/propositions/` から）と、`:` のあとで 6 つの態度を候補に出す。
- 確かめ方: `go test ./internal/lsp/server/... -run Completion`。
- 期待: `reader_shows:` の下の `- lo` で `loc` が出る。`- loc:` で 6 つの態度が出る。本文中では出ない。
- 落ちる形: 命題を 1 つ消すと候補から消える。
- 注意: 今の LSP に補完は無い（`CompletionItem` が `internal/lsp` に無い）。初期化応答の `capabilities` に `completionProvider` を足すところから始まる。

### V8 サンプルと文書

- 単位: `samples/` のどれか 1 つに `src/propositions/` と frontmatter の例。`CLAUDE.md` と `docs/mcp.md` に Proposition、`reader_shows` / `reader_requires`、`manuscript build`、補完を追記。
- 確かめ方: `storyteller meta check --path samples/<選んだもの>` が終了コード 0。
- 期待: 0。
- 落ちる形: サンプルの 1 章から `reader_shows` を消す。

### V9 設計モデルの同期

- 単位: `verify-reader-prereq` の SKILL.md。
- 確かめ方: V4 が通ったら `/maintain-formal-verification-skill` を走らせ、モデルの `ReadChapter` が `ReaderPrereqService` の原稿 1 ファイルの処理に対応するか、`Shows` / `Requires` が `testdata/clarity_rainkey` の frontmatter と一致するかを読む。
- 期待: 同期コミットを実装のコミットに進められる。
- 落ちる形: 無し。読んで確かめる項目。

## 落ちたとき: 実装の欠陥か、項目の都合か

1. V4 の壊し版の違反が表と違う。違反が出ないなら実装の欠陥。違反の章や行が違うなら、まず表の期待が設計（`docs/clarity.md`）どおりかを読み、設計どおりなら実装の欠陥。
2. V4 の本編で違反が出る。`testdata/clarity_rainkey` が `docs/designs/reader-prereq-sketch.ts` の `manuscripts` と一致するかを読む。一致していれば実装の欠陥。
3. 期待を書き換えて通すことはしない。設計を変えるなら `docs/clarity.md` と `verify-reader-prereq` を先に直す。

## カバレッジと同期コミット

- 対象: 上の各項目に書いたファイル。実装の実体は次のとおり。
  - V1: `internal/domain/proposition.go`、`internal/project/entity/loader.go`（`LoadProposition` / `mapProposition`）、`internal/project/store/store.go`（`AddProposition` ほか）、`internal/project/manifest/manifest.go`（`Paths.Propositions`）、`internal/project/project.go`（`loadPropositionIntoStore`）
  - V2: `internal/meta/frontmatter.go`（`ReaderShows` / `ReaderRequires`）、`internal/mcp/tools/manuscript_binding.go`（`validateClarityEntries`）
  - V3: `internal/domain/clarity.go`（`ParseDisclosure` / `ParseRequirement`）
  - V4: `internal/service/reader_prereq.go`（`ReaderPrereqService.Run`）、`internal/service/testdata/clarity_rainkey/`
  - V5: `internal/service/meta_check.go`、`internal/cli/modules/meta/check.go`（`PresentMetaCheck`）、`internal/mcp/tools/meta_check.go`
  - V6: `internal/cli/modules/manuscript/build.go`
  - V7: `internal/lsp/server/completion.go`、`internal/lsp/protocol/messages.go`（`CompletionParams` ほか）
  - V8: `samples/cinderella/src/propositions/glass_slipper_fit.ts`、`samples/cinderella/manuscripts/chapter02.md` / `chapter04.md`、`docs/cli.md`、`docs/mcp.md`、`docs/lsp.md`、`CLAUDE.md`、`.claude/skills/storyteller-writing/`（`references/workflow-clarity.md` 新規）、`.claude/commands/story-check.md`
- 同期コミット: 未確定。上のファイルは 2026-11-07 時点で未コミット。最初に取り込んだコミットをここに書く。
- 実装と設計の差: `RDR-104` は `resolutionPolicy` だけを見て `authorTruth` を読まない（TLA+ モデルと同じ）。`reader_requires` は章の先頭で評価し、同じ章の `reader_shows` では満たせない。

## 記録

| 項目 | 日付 | 結果 |
|---|---|---|
| V0 | 2026-11-07 | 通った（`verify-reader-prereq` 参照） |
| V1 | 2026-11-07 | `go test ./internal/project/... ./internal/domain/...` 281 件通過。`resolutionPolicy: "keep"` と `authorTruth` 省略が validation エラー |
| V2 | 2026-11-07 | `go test ./internal/meta/... ./internal/mcp/tools/...` 通過。順序保持、`loc:believed` を binding が拒否 |
| V3 | 2026-11-07 | `go test ./internal/domain/` 通過 |
| V4 | 2026-11-07 | `go test ./internal/service/` 20 件通過。本編 0 件、壊し版 6 通りが表どおり（ch-02 空: RDR-102 ×2、misled 削除: RDR-103、corrected 削除: RDR-104、逆転: RDR-103 + RDR-104、withheld 削除: RDR-102、未知 ID: RDR-101 + RDR-102） |
| V5 | 2026-11-07 | CLI と MCP のテスト通過。実バイナリで `clarity_rainkey_break1` に `meta check` → 終了コード 1、`chapter03.md:6 RDR-102 命題 loc の前提 shown が前の章に無い` |
| V6 | 2026-11-07 | `go test ./internal/cli/...` 308 件通過。実バイナリで壊し版を `manuscript build` → 終了コード 1、出力先ディレクトリは作られない |
| V7 | 2026-11-07 | `go test ./internal/lsp/...` 78 件通過。golden `initialize_response.json` に `completionProvider` を追加 |
| V8 | 2026-11-07 | `go run ./cmd/storyteller meta check --path samples/cinderella/manuscripts` → `4 files validated`。写しから第 2 章の `reader_shows` を消すと `chapter04.md:16 RDR-102` で終了コード 1 |
| V4 追加 | 2026-11-07 | 読めないプロジェクト（壊れた `.ts`）は検査を落とす（静かに通さない）。manifest が無い場合だけ RDR-101 を飛ばす。サンプル cinderella の写しで `nope:shown` を書くと `chapter02.md:19 RDR-101` が出ることを実バイナリで確認（命題が実際に読み込まれている証拠） |
| 全体 | 2026-11-07 | `go test ./...` 1168 件通過、`go vet` 変更パッケージ無警告、`gofmt -l` 空 |
