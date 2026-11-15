---
name: verify-review-impl
description: storyteller review（clarity・typo・interest・consult・turn・resolve）の実装を最後まで進めるための検証項目。各単位の「できた」の判定、判定モデルに送る問いが prayground の Python とバイト単位で同じか、2 回目のパネルの再生、壊し表、実機の試験を持つ。review の実装に触れる変更をしたら、コミット前にこのスキルを開き、該当する項目を走らせて結果を引用する。
---

# verify-review-impl

設計は `docs/designs/review.md`（3 版）。このスキルは、実装がその設計どおりに動くかを見る。設計と食い違うときは、このスキルの「決めたこと」が実装の契約である（設計書の書き方が足りない所を埋めたもの）。

状態（2026-11-15）: R1〜R17 通った（末尾の記録）。R18 は記録を見る。項目を走らせて通ったら、末尾の記録に日付と結果を書く。走らせていない項目は通ったことにしない。

## 範囲

作るもの: R1〜R16。

作らないもの（この範囲の外）:

- `lint` と `reader check` を消すこと、変えること。
- prayground のスクリプトを消すこと、prayground の命題（`statement`）を書き換えること。
- MCP の道具。
- 名簿の `local` のような別名。名簿の `runtime` は ateam の起動種別（`claude-code`・`codex`・`grok-build`）だけを書く。
- 編集者の読者（P7）。

## 決めたこと（実装の契約）

### データ

- `domain.Proposition` に `Ask *Ask` を足す（`ask` が無ければ nil）。`Ask{Main bool; Question string; Answer AnswerKey; Reask Reask}`、`AnswerKey{Must []string; Extra string}`、`Reask` は `"now"` か `"at-deadline"`（空は未指定）。
- 読み込み（`mapProposition`）: `ask` は任意。あるときは `question`（文字列）が要る。`answer.must`（空でない文字列の配列）は `main: true` のとき要る。本筋でない `ask` は判定にかけないので `answer` を省ける（2026-11-15、prayground の本筋でない 16 件に模範解答が無いため）。`answer` を書いたときは、`main` によらず `must` を検査する。`main` は任意で既定 false。`reask` は任意で、あれば 2 値のどちらか。違えば validation error。
- `src/type/v2/proposition.ts` に `ask?: { main?: boolean; question: string; answer: { must: string[]; extra?: string }; reask?: "now" | "at-deadline" }` を足す。
- `manifest.Manifest` に `Review *ReviewConfig` を足す（`review` が無ければ nil）。`ReviewConfig{Judge string; Launcher LauncherConfig{Ateam string}; Agents []ReviewAgent{Agent, Runtime, Model, Effort string}; StallMinutes int}`。`stallMinutes` が無いか 0 なら 60。負は invalid。`runtime` は `claude-code`・`codex`・`grok-build` のどれか。`agent` は `^[A-Za-z0-9_-]+$` で重複なし。

### 本文の扱い

- 章は、原稿のディレクトリ直下の `.md` をファイル名順に並べたもの（`service.WalkStances` と同じ）。
- 工程2 に渡す本文は prayground の `body_of` と同じ: `\A---\n.*?\n---\n` を消し（改行も跨ぐ）、`<!--.*?-->` を消し（同じ）、前後の空白を除く。
- clarity の AI エージェントに置く写しは、frontmatter と各 `<!-- -->` を、含んでいた改行の数だけの改行に置き換える。ほかは 1 バイトも変えない。行の位置は元のファイルと同じになる。
- interest と consult の写しは、元のファイルのまま。
- 期限章は、本文の印 `<!-- shows: <id>:shown -->` が最初に出る章の番号（1 始まり）。無ければ 0。`internal/service` の `ChapterStances` に印を読む公開の関数を足してよい（書き換えはしない）。

### 問い（バイト単位で prayground の Python と同じ）

正解は `internal/service/review/testdata/rainkey/golden-queries.json`。prayground の `decide-probe.py` と `judge-answers.py` の実物から、送るはずだった本文を捕まえて作った（API は呼んでいない）。

- `Query{Name string; State any; KeyState string; Instructions string}`。送る本文は `{"model": <model>, "state": State, "questions": {Name: {"type": "noul", "instructions": Instructions}}}`。
- 鍵は `hex(sha256(model + "\n" + KeyState + "\n" + Instructions))`。
- 工程2: `Name="fact"`、`State` は期限章までの本文の配列、`KeyState` はその配列の `encoding/json` の出力。指示文は正解の `request.questions.fact.instructions` と同じ（事実の文は命題の `statement`）。
- 工程3b: `Name="f"`、`State` と `KeyState` は読者の答えの文字列。1 セルにつき「模範解答の 1 文」1 問と、必須項目ごとに 1 問。指示文は正解と同じ。必須項目は `；` ではなく配列で持つ。補足が空なら「。補足（無くてよい）: …」を付けない。
- 問いの文: `ask` は `Ask.Question`。`reask` は、`at-deadline` なら `"（" + 期限章の数字 + "章を読み終えた時点で）" + Ask.Question`、`now` なら `Ask.Question`。

### 判定

- `Profile{Name, JudgeModel string; ProbeMin, WholeMin, ItemMin float64}` を 1 つだけ Go の定数で持つ: `google/gemini-decision-1`、0.2、0.6、0.5。設定で変えない。
- 工程2: 値が `ProbeMin` 未満なら `edit`（REV-201）。
- 工程3b のセル: 1 文の値が `WholeMin` 以上で、必須項目の値の最小が `ItemMin` 以上なら stated。値が 1 つでも取れなければ保留。それ以外で、答えの前後の空白を除いた文が「不明」で始まれば unknown、そうでなければ保留。
- 著者が解いた記録 `src/reviews/resolved.tsv`: 列は `agent fact ref answer_sha key_sha decision reason`（タブ区切り、`#` で始まる行は読み飛ばす）。`ref` は `ask`・`reask`。`answer_sha` は答えの sha256 の先頭 12 桁、`key_sha` は `{question, must, extra}` の JSON の sha256 の先頭 12 桁。2 つとも今の値と合うときだけ効く。`accept` は stated、`reject` は unknown にする。
- 工程3b のまとめ: 判定の失敗があれば `error`（REV-401）、unknown があれば `edit`（REV-202）、保留があれば `author`（REV-306）、全部 stated なら `pass`。

### 判定のキャッシュ

- `<作品>/.storyteller/review/judge-cache.jsonl`。1 行 1 件の `{"key": "<hex>", "value": <float>}`。prayground の `judge-cache.jsonl` と同じ形で、そのまま写して使える。同じ鍵が 2 行あれば後の行を使う。
- 判定はキャッシュを先に引く。外れたら判定モデルを呼び、値を 1 行足す。判定モデルが無いとき（オフライン）は、外れを失敗にする。

### 止まる条件の指紋（`criteria`）と run の id

- `criteria`: 次のものを `encoding/json` にした sha256 の先頭 8 桁。`ask` を持つ命題（id 順。`id`・`statement`・`authorTruth`・`resolutionPolicy`・`ask`）、章ごとの印の列と `reader_requires`、名簿（`agent`・`runtime`・`model`・`effort`）、実際に使う指示文の中身の sha256、`Profile`、効いている著者の記録。本文の文字、`stallMinutes`、ateam の場所、`judge` の文字列は入れない。
- run の id: `"r-"` と、種類・`criteria` の材料・AI エージェントに置く全部の写し（interest と consult は利用者の指示も）の sha256 の先頭 8 桁。本文を 1 字変えると変わる。
- 著者の記録だけが変わって run の id が変わったときは、読者に渡したもの（写し・問い・模範解答・名簿・指示文）が同じなら、前の run の読者の記録を引き継ぐ。読ませ直さない（2026-11-15、R13 の実装で決めた）。
- `--dry-run` は送る予定を出すだけで、終了コード 0（`done`）。何も送らず、起動もしない。

### ステップ（clarity）

- 章 1 から順に、章のステップ（ファイル名は元のまま）を置く。その章が期限章の `ask` があれば、続けて問いのステップ（`ask-NN.md`。1 行目 `# N章を読み終えたあとの問い`、続けて `<id>. <問い>` を期限章の命題 id 順）。最後に再問のステップ（`ask-final.md`。本筋だけ、`<id>（再）. <問いの文>`）。見本では 7 ステップになる（chapter01・ask-01・chapter02・ask-02・chapter03・chapter04・ask-final）。
- 本筋でない `ask` も問いのステップに入れる。判定にはかけない。

### AI エージェントの作業ディレクトリと記録

- 作業ディレクトリ: `<WorkRoot>/<run>-<agent>`。既定の `WorkRoot` は `os.TempDir()` の下の `storyteller-review`。起動の前に `README.md`（指示文を埋めたもの）と最初のステップのファイルを置く。
- run と作品の対応: `<MapRoot>/<run>.json`（作品のルートと原稿のディレクトリ）。既定の `MapRoot` は `os.UserCacheDir()` の下の `storyteller/review/runs`。作業ディレクトリの中にも、その親にも置かない。
- 記録: `<作品>/.storyteller/review/runs/<run>/<agent>.jsonl`。1 行 1 ステップ（`step`・`kind`・`file`・`notes`・`answers`・`at`）。起動の記録は同じディレクトリの `launch.json`（AI エージェントごとの試行の回数・起動の id・ateam の run_id・起動の時刻）。ロックは同じディレクトリの `lock`。
- `README.md` の `{{persona}}`・`{{command}}`・`{{instruction}}` を埋める。`{{command}}` は `storyteller review turn --run <run> --agent <agent>`。指示文は `internal/service/review/prompts/` に同梱し（`go:embed`）、作品の `src/reviews/prompts/` に同じ名前があればそちらを使う。役は `persona-<agent>.md`。

### `review turn`

- `review turn --run R --agent A --step N --notes -`（章）か `--answers -`（問い）。stdin から読む。
- 受け取ったら記録に 1 行足し、次のステップのファイルを置き、出力の 1 行目に `STEP <次の番号>/<全体>` と 2 行目にファイル名を書く。最後のステップを受け取ったら 1 行目は `DONE`。
- 先のステップは受け取らない（終了コード 1）。済んだステップを出し直すと、記録を変えず、受け取ったときと同じ出力を返す（終了コード 0）。空の返答は受け取らない（1）。問いのステップで、置いた問いの id が 1 つでも欠けた答えは受け取らない（1。欠けた id を出す）。
- 答えの読み方は prayground の `load_answers` と同じ: 行ごとに `^[-*|\s]*(<id>)(（再）)?[.．:：]\s*(.+)` を当て（`\s` は Unicode の空白を含む）、同じ id は最初の行を使う。再問のステップは `（再）` の付いた行を先に使い、無ければ付かない行を使う。
- `--run` が今の作品の run の id と違えば受け取らない（4）。clarity では、今の本文が工程1 を通り、工程2 の値が全部キャッシュにあって閾値以上のときだけファイルを置く。

### `review.Run`

- 設計書「1 回の実行」の手順どおり。設計書の旧版の `--read` は `--team` に替えた。`--read` は受け付けない（終了コード 2）。
- `Deps` で差し替えられるもの: 判定モデル、Launcher、今の時刻、待つ関数、`WorkRoot`、`MapRoot`、textlint。試験は全部 Fake にする。
- AI エージェントの起動は 1 体ずつ。起動の id は `<run>-<agent>-a<試行の回数>`。起動の文面は `作業ディレクトリの README.md を読んで、そのとおりに進めてください。` の 1 文だけ。
- 止まったとみなすのは、最後に記録が進んだ時刻（無ければ起動の時刻）から `StallMinutes` 分。起動し直すのは 2 回まで。Launcher が起動の失敗を返したら、待たずに `error`（REV-403）。
- run ごとのロックがあれば、AI エージェントを起動せず `reading` を返す。ロックが 5 分より古ければ取り直す。
- 種類ごとに今の run を `<作品>/.storyteller/review/current-<kind>.json` に書く。run の id が変わったら、前の run の生きている起動を閉じる。
- interest・consult: 判定モデルは使わない。consult は名簿の `runtime` の種類ごとに最初の 1 体（役なし）、interest は名簿の全部（役つき）。ステップは 1 つ（`--notes`）。全部が返したら、返答を AI エージェントごとに並べて `done`。consult は利用者の指示が要る（無ければ `usage`）。clarity・typo に指示を渡すと `usage`。

### 終了コードと出力

- 0 `pass`・`done`、1 `edit`、2 `usage`、3 `author`、4 `error`、5 `reading`。
- `--json` のときは、どの終了コードでも stdout に JSON を 1 個だけ出す（`Report`）。テキストのときは最後の行を `RESULT <VERDICT> exit=<N> …` にする。
- 指摘の番号: REV-201 工程2 の閾値未満、REV-202 unknown・reject、REV-301 止まる条件の不備、REV-302 `--criteria` と違う、REV-303 判定モデルの設定が無いかモデルが `Profile` と違う、REV-304 読者がまだ読んでいない、REV-305 `--team` なのに名簿か ateam の場所が無い、REV-306 保留、REV-401 判定の失敗、REV-402 AI エージェントが止まった、REV-403 起動の失敗、REV-404 textlint が無い、REV-501 typo の指摘。工程1 の指摘は meta check の RDR 番号のまま出す。

### 外とのつなぎ

- 判定モデル（`internal/external/decisions`）: `POST https://openrouter.ai/api/alpha/decisions`、`Authorization: Bearer $OPENROUTER_API_KEY`、本文は上の形。答えは `answers.<Name>.noul`。鍵が無い、200 以外、形が違う、は失敗。`net/http` を使うのはここだけ。
- ateam（`internal/external/ateam`）: `<ateam> dispatch <起動の id> --project <作業ディレクトリ> --task "storyteller review" --assignments '[{"role": <agent>, "runtime": <runtime>, "model": <model>, "effort": <effort>, "brief": <起動の文面>}]'`。出力の `run_id=<id>` を控える。`run_id` の無い出力（同じ起動の id の再送）は、控えが無いまま成功とする。閉じるのは `<ateam> close <run_id>`。`~` は家のディレクトリに広げる。`process.Runner` を使う。
- typo: textlint が無ければ（`textlint.IsAvailable`）`error`（REV-404）。原稿のディレクトリ直下の `.md` を 1 つずつ渡し、指摘ごとにファイル・行・その行の文・規則と説明を出す。

## 項目

各項目は「単位」「確かめ方」「期待」「落ちる形」を持つ。落ちる形は、わざと壊して検査が落ちることを一度見るためのもの。見ていない検査は通ったことにしない。

### R1 命題の `ask` 欄

- 単位: `internal/domain/proposition.go`、`internal/project/entity/loader.go`、`src/type/v2/proposition.ts`。
- 確かめ方: `go test ./internal/project/... ./internal/domain/... -run 'Proposition|Ask'`。
- 期待: 見本の `door.ts`・`loc.ts` の `ask` が読める。`ask` の無い命題は nil。既存の命題の試験が通る。
- 落ちる形: `reask: "later"` が validation error になる試験を、検査を外して落とす。

### R2 `.storyteller.json` の `review`

- 単位: `internal/project/manifest/`。
- 確かめ方: `go test ./internal/project/manifest/... -run Review`。
- 期待: 見本の設定が読める。`stallMinutes` が無ければ 60。`review` が無ければ nil。
- 落ちる形: `runtime: "local"` と agent の重複が invalid になる。

### R3 問いの文字列（バイト一致）

- 単位: `internal/service/review` の問いの組み立て。
- 確かめ方: `go test ./internal/service/review/ -run Golden`。
- 期待: 見本の 2 件の工程2 と 4 セル 10 問の工程3b で、送る本文（JSON として）と鍵が正解と同じ。
- 落ちる形: 指示文の「。」を 1 つ消すと落ちる。

### R4 Spec・セル・`criteria`・止まる条件の不備

- 確かめ方: `go test ./internal/service/review/ -run 'Spec|Cells|Criteria|Defect'`。
- 期待: 見本は 3 体 × 本筋 2 件 × 2 = 12 セル。期限章は door 1、loc 2。`criteria` は `ask`・`statement`・印・名簿・指示文の上書き・著者の記録のどれを変えても変わり、本文の文字と `stallMinutes` を変えても変わらない。本筋の `ask` に shown の印・問い・必須項目・`reask` のどれかが無ければ REV-301。
- 落ちる形: `criteria` から名簿を外すと、名簿を変えた試験が落ちる。

### R5 判定とまとめ

- 確かめ方: `go test ./internal/service/review/ -run 'Decide|Verdict|Resolved'`。
- 期待: 「判定」の規則どおり。著者の記録は答えか模範解答が変わると効かない。
- 落ちる形: 閾値を 0.5 にすると境界の試験が落ちる。

### R6 判定のキャッシュ

- 確かめ方: `go test ./internal/service/review/ -run Cache`。
- 期待: 当たりで判定モデルを呼ばない。外れで 1 回呼んで 1 行足す。オフラインの外れは失敗。
- 落ちる形: 鍵の改行を外すと、正解の鍵と合わずに落ちる。

### R7 2 回目のパネルの再生（lead だけが走らせる）

- 単位: 再生の試験。`STORYTELLER_REVIEW_REPLAY=<dir>` が無ければ skip。`<dir>` は `project/`（作品）・`answers/<agent>.md`（読者の報告）・`judge-cache.jsonl`・`judge.tsv`（prayground の `r2/judge.tsv`）。
- 確かめ方: `STORYTELLER_REVIEW_REPLAY=<dir> go test ./internal/service/review/ -run Replay -v`。
- 期待: 264 セルの 1 文の値と項目の値が `judge.tsv` と小数 3 桁で同じ。判定（著者の記録を除いたもの）が同じ。判定の照会 780 回が全部キャッシュに当たる。
- 落ちる形: 問いの文を 1 字変えると、外れが出て落ちる。
- 注意: データは未公開の作品と答えである。リポジトリに入れない。AI エージェントに開かせない。

### R8 `review turn`

- 確かめ方: `go test ./internal/service/review/ -run Turn`。
- 期待: 「`review turn`」の決まりどおり。写しに frontmatter と `shows:` の印が無く、行数が元と同じ。返答を受け取るまで、次のファイルが作業ディレクトリに無い。AI エージェントごとに作業ディレクトリが分かれる。run と作品の対応のファイルが作業ディレクトリの中にもその親にも無い。
- 落ちる形: 先のステップを受け取るようにすると落ちる。

### R9 `review.Run` と壊し表

- 確かめ方: `go test ./internal/service/review/ -run Run`。
- 期待: 設計書の受け入れ試験の壊し表が全部通る（本文を直す、判定が全部失敗、AI エージェントが 1 体止まる、まだ読んでいる、`--observations` を渡す、判定モデルの設定が無い、`--team` が無く記録も無い、`--team` があり名簿が無い、起動の途中で止められた、工程2 が 0.2 未満、`--criteria` を張って保留を解く・印を下げる・模範解答を変える・名簿を変える）。Fake の Launcher で、起動の文面に本文が無い。ロックがあると起動しない。止まった AI エージェントは 2 回まで起動し直し、3 回目は起動しない。
- 落ちる形: 工程2 を飛ばして起動するようにすると落ちる。

### R10 CLI

- 単位: `internal/cli/modules/review/`、`internal/cli/modules/index.go`。
- 確かめ方: `go test ./internal/cli/... ./cmd/... -run Review`。
- 期待: `review clarity|typo|interest|consult`、`review turn`、`review resolve` がある。未知のフラグと余分な引数は終了コード 2。`--json` では、どの終了コードでも stdout が JSON 1 個。`help` に review が出る。
- 落ちる形: 未知のフラグを読み飛ばすようにすると落ちる。

### R11 typo

- 確かめ方: `go test ./internal/service/review/ -run Typo`。
- 期待: textlint が無ければ 4。指摘があれば 1 で、ファイル・行・その行の文が出る。無ければ 0。
- 落ちる形: textlint が無いときに 0 を返すようにすると落ちる。

### R12 interest・consult

- 確かめ方: `go test ./internal/service/review/ -run 'Interest|Consult'`。
- 期待: consult は種類ごとに 1 体、interest は名簿の全部。作業ディレクトリに全章の元のままの写しと指示文がある。全部が返すと 0 で、返答が並ぶ。consult に指示が無ければ 2。
- 落ちる形: consult で名簿の全部を起動するようにすると落ちる。

### R13 `review resolve`

- 確かめ方: `go test ./internal/service/review/ ./internal/cli/... -run Resolve`。
- 期待: `review resolve P2:loc:reask --accept --why "…"` が `src/reviews/resolved.tsv` に 1 行足し、`criteria` が変わる。そのセルは次の判定で stated になる。今の記録に無いセルを指すと 2。
- 落ちる形: ハッシュを見ずに効かせると、答えを変えた試験が落ちる。

### R14 判定モデルへの送信

- 単位: `internal/external/decisions/`。
- 確かめ方: `go test ./internal/external/decisions/...`（`httptest` のサーバー）。実機は lead が、`OPENROUTER_API_KEY` があるときだけ、ダミーの文で 1 回呼ぶ。
- 期待: 送る本文が正解の `request` と同じ。鍵が無い・200 以外・形が違う、は失敗。
- 落ちる形: `Authorization` を外すとサーバーの試験が落ちる。

### R15 ateam の起動

- 単位: `internal/external/ateam/`。
- 確かめ方: `go test ./internal/external/ateam/...`。`testdata/dispatch.out` と `close.out` は 2026-11-15 の測定の実際の出力（家のパスを置き換えた）。
- 期待: 組み立てる引数が「外とのつなぎ」のとおり。`dispatch.out` から run_id `1010633ecc0a` を取る。`run_id` の無い出力は成功で、控えなし。0 以外の終了は失敗。
- 落ちる形: `--project` を外すと落ちる。

### R16 文書

- 単位: `docs/review.md`（新設）、`docs/clarity.md`（「LLM は外で動く」の決定を改める）、`docs/designs/review.md` の名簿の例。
- 確かめ方: 読む。`storyteller help` の出力に review が出る。
- 期待: 使い方・設定・終了コード・置き場所・送り先が書いてある。名簿の例が `claude-code`・`codex`・`grok-build` と実際のモデル名になっている。

### R17 全体

- 確かめ方: `go vet ./...`、`go test ./...`、`make build`、`go.sum` が空のまま。
- 期待: 全部通る。新しい依存が無い。

### R18 実機の試験（lead だけが、全部が通ったあとで走らせる）

- 確かめ方: 作品の本文を使わず、ダミーの作品（約 36KB の章を含む 10 章）を作り、`storyteller review clarity --team` で 3 種類のハーネスの AI エージェントを 1 体ずつ起動し、終わるまで同じ行を打ち直す。続けて `review consult` を 1 回。終わったら AI エージェントが閉じていることを `ateam.sh status` で見る。
- 期待: 3 体とも作品の外のディレクトリで起動し、全ステップを返す。36KB の章の末尾に置いた合い言葉を記録に書く。判定モデルの外部送信はダミーの文だけ。

## 記録

### 2026-11-15（1 回目の実装。ateam coding の run 8453b711700c）

- R1〜R6・R8〜R15: 各項目の確かめ方が通った。落ちる形は 14 項目とも、壊すとその試験だけが落ちることを見た（coding-claude が `go test -overlay` の写しで、coding-codex がツリーで。どちらも元に戻した）。
- R7: lead が prayground の r2 から作った写し（statement は facts.tsv の文）で `STORYTELLER_REVIEW_REPLAY=<dir> go test ./internal/service/review/ -run Replay` → `Go test: 1 passed`。264 セル、照会 780 回が全部キャッシュに当たり、値と判定が judge.tsv と同じ。落ちる形: S23 の問いを 1 字変えた写しで `36 cache misses` で落ちた。試験の判定表の読み方（列名 `persona`、`問い#`・`再問#`、項目の `,` 区切り、`（著者）` の行は値から判定し直す）を lead が直した。
- R13: 著者の記録で run の id が変わる件は、読者の記録を引き継ぐ形にした（「決めたこと」に追記）。
- R16: `docs/review.md` を新設、`docs/clarity.md` と設計書の名簿の例を直した。`storyteller help` に review の 6 コマンドが出る。
- R17: lead が `go vet ./...`（出力なし）、`go test ./... -count=1` → `Go test: 1317 passed in 48 packages`、`make build` 終了 0、`go.sum` 0 バイト。
- R18 clarity: ダミーの作品（10 章、7 章は 36,275 バイト）で `storyteller review clarity --team` を 3 回打ち、3 回目で `RESULT PASS exit=0`（約 5 分）。P1 claude-code（claude-fable-5-1）、P2 codex（gpt-6.1-sol）、P6 grok-build（grok-4.7）が 14/14 ステップを返した。作業ディレクトリは `$TMPDIR/storyteller-review/r-287218eb-<agent>`。3 体とも 7 章の最終行（607 行目）を記録で引用した（合い言葉そのものを書いたのは P6 だけ。P1 と P2 は役として「物語と関係ない」と書かなかった）。終わったあと 3 体の起動は `closed`。判定モデルへの送信は 30 回（キャッシュ 15 件）で、送ったのはダミーの文だけ。
- R18 consult: 同じダミーの作品で `storyteller review consult --path … "7章が長すぎる。どこを削るか相談したい"` を 2 回打ち、2 回目で `RESULT DONE exit=0`（約 1 分半）。種類ごとに 1 体（claude-code・codex・grok-build）が返答し、本文を引用して案を出した。終わったあと 3 体の起動は `closed`。
- `--read` の別名を外した（著者の決定は `--team`）。`--read` は終了コード 2。
- 実装中に、メンバーのどれかが見本「雨夜の鍵」を本物の判定モデルにかけた（工程2 の 2 問。見本は公開のダミー）。指示に反する。見本の loc は工程2 が 0.194 で、本物の判定モデルでは REV-201 になる。
