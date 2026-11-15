# `storyteller review` 設計案（2026-11-15）

状態: 案（3 版）。実装していない。著者に決めてもらう点は残っていない。「既定案」の節は、著者がまだ確かめていない。

2 版では読者の動かし方を著者の決定で作り直した。読者は agmsg（ateam）で起動する、種類の違う AI エージェントのハーネスで動かす。同じハーネスだと、役（指示文）を変えても読み方の方向が同じになったためである。依頼は「agmsg で起動する AI エージェントを前提にし、ほかの起動の仕方も足せる形にする」と読み、著者がその読みを確かめた。

3 版では次の 3 つを変えた。AI エージェントを起動するのは `--team` を付けたときだけにした。AI エージェントは作品の外のディレクトリで起動し、storyteller が、読むファイルを 1 つずつそこへ写す。面白さと相談の使い方を書いた。はじめの 2 つは著者が決めた。

この文書で使う言葉は次のとおり。

- **AI エージェント**: 脚本を読ませるために起動する、Claude Code・Codex・Grok Build などの 1 体。1 体に読者の役を 1 つ割り当てる。
- **ハーネス**: AI エージェントの種類（Claude Code、Codex、Grok Build）。
- **ループのエージェント**: `/goal` のループを回して本文を直す側。読者の AI エージェントとは別である。
- **先読み**: AI エージェントが、渡された章より先の章を読んでしまうこと。検査は「N 章を読み終えた時点で読者が何を分かっているか」を見るので、先読みがあると成り立たない。
- **判定モデル**: 文章と問いを渡すと、0 から 1 の確率を返すモデル（OpenRouter の `google/gemini-decision-1`）。同じ入力には同じ値を返す。
- **期限章**: 読者がその事実を分かっているべき章。
- **工程1〜工程3b**: 検査の順番。工程1 は、命題と宣言が合っているかを調べる。工程2 は、判定モデルに「期限章までの本文に、この事実が書いてあるか」を聞く。AI エージェントは使わない。工程3 は、AI エージェントが 1 章ずつ読んで問いに答える。工程3b は、その答えを判定モデルが模範解答と比べる。
- **ステップ**: 工程3 の中の 1 区切り。AI エージェントがファイルを 1 つ読み、`review turn` で記録か答えを 1 回出すまでを指す。

## 問題

storyteller は登場人物・プロット・伏線・命題を `src/` にコードで整理し、作品の品質を上げる道具である。レビューは、筆者が自分で良いと判断できる物語に仕上げるための機能の 1 つで、「自分以外の観点」を入れて見落としを減らす。種類は 4 つある。分かりやすさ（clarity）と誤字（typo）は、決まった形で結果を出し、Claude Code の `/goal` ループで本文を直しながら収束させる。面白さ（interest）と相談（consult）は合否を出さず、著者と話しながら進める。

今のレビューは prayground リポジトリの手作りで、スクリプト 7 本と手順書をエージェントがつないでいる。失敗は、工程のあいだを人やエージェントが受け渡す所で起きた。判定の工程より先に読者を起動した。別の LLM が観測を作って判定が揺れた。観測が空でも合格になった。問いだけ作り直すと、読み直さずに合格になった。

形を難しくしている制約は次のとおり。

- storyteller は依存ゼロの Go で、HTTP も LLM の呼び出しも持たない。docs/clarity.md は「LLM が担うのは観測と命題 id への対応づけまで」と決めている。この案はそれを変える。
- 判定モデル（OpenRouter の Decisions API）は、同じ入力に同じ値を返す。ただし値は入力の形で大きく動く。測った問いの組み方と閾値は、1 バイトも変えられない。
- CLI は著者とエージェントを見分けられない。
- 読者の AI エージェントは ateam で起動する。ateam は tmux か Herdr の中でしか動かず、「1 回の仕事に 1 回返す」作りである。返信して手が空いた AI エージェントを次の送信で起こせるのは、Claude Code と Codex だけである（コードの読み。未検証）。
- 1 回の読みは数分から数十分かかる。Claude Code がコマンドを待つ時間は、既定で 120 秒、最大でも 10 分である。
- `/goal` は条件文を字面で判定する。止まる条件は終了コードで表す必要がある。
- `reader check` は 2026-11-15 に main へ入れたばかりである。行の無い読者と行の無い章を判定しない。

## 使い方（呼ぶ側から見た形）

### 場面 1: `/goal` のループ（AI エージェントを起動しない）

著者が 1 回走らせ、出力の `criteria`（止まる条件の指紋）を条件文に写す。

```
/goal 次のコマンドの終了コードが 0・2・3・4 のどれかになる。直してよいのは src/drafts/01/v3/ だけ。
終了コード 5 のときは本文を直さず、同じ行をもう一度打つ。2・3・4 のときは本文を直さず、出力を著者に渡す。
  bash .claude/skills/verify-manuscript/scripts/verify.sh src/drafts/01/v3 manuscripts/01/v3 \
  && storyteller review typo --path src/drafts/01/v3 --json \
  && storyteller review clarity --path manuscripts/01/v3 --criteria c7d29a41 --json
```

ループのエージェントが打つのは、この同じ行だけである。`--team` の無い `review clarity` は AI エージェントを起動しない。工程1（構造）と工程2（判定モデル）を調べ、落ちれば終了コード 1 を返すので、ループのエージェントが本文を直す。同じ本文には同じ結果が出る。工程2 は本文を判定モデル（OpenRouter）に送る。本文を直すと、直した章より後に期限章がある事実は判定のキャッシュに無いので、その分を送り直す。工程1 と工程2 が通っても、今の本文を読者がまだ読んでいなければ、終了コード 3 で著者に渡す。終了コード 5 が返るのは、著者が `--team` で起動した AI エージェントがまだ読んでいるときだけである。review の各コマンドの stdout は、どの終了コードでも JSON が 1 個で、次に動く人は `verdict` に出る。

```
{"kind":"clarity","verdict":"author","stage":"read","criteria":"c7d29a41",
 "findings":[{"code":"REV-UNREAD","message":"工程1 と工程2 は通った。この本文を読者はまだ読んでいない。読ませるときは --team を付けて打つ"}]}
終了コード 3 → ループは止まり、出力を著者に渡す
```

### 場面 2: 著者が読者に読ませる

著者が `--team` を付けて打つと、AI エージェントが起動する。storyteller は、AI エージェントごとに作品の外へディレクトリを作り、読むファイルを 1 つずつそこへ写す。AI エージェントは、写されたファイルを開いて読み、`review turn` で記録や答えを出す。出すと、次のファイルが写される。前に読んだファイルは残る。`review turn` の打ち方は、最初に置く `README.md` に書く。

```
（AI エージェント P2 の作業ディレクトリ。最初にあるのは README.md と chapter01.md）
storyteller review turn --run r-5be01c9a --agent P2 --step 1 --notes - <<'NOTES' … NOTES
  → chapter02.md を置いた（2/21）
storyteller review turn --run r-5be01c9a --agent P2 --step 2 --notes - <<'NOTES' … NOTES
  → ask-02.md を置いた。2 章を読み終えたあとの問い（S09、S04、G02、S58）
storyteller review turn --run r-5be01c9a --agent P2 --step 3 --answers - <<'ANSWERS' … ANSWERS
  → chapter03.md を置いた
…（最終章のあとに再問）
  → DONE
```

著者の側は、同じ行を打ち直して進める。AI エージェントが読んでいるあいだは終了コード 5 が返る。

```
$ storyteller review clarity --path manuscripts/01/v3 --team --dry-run
送る予定: 工程2 判定 22 回（キャッシュ 22）／AI エージェント 6 体（P1 claude-code、P2 codex、P3 local → grok-build、…）／工程3b 判定 780 回（キャッシュ 0）
$ storyteller review clarity --path manuscripts/01/v3 --team
PASS 工程1 構造（meta check、止まる条件の不備なし）
PASS 工程2 本筋 22 件が閾値 0.2 以上
READ AI エージェントを起動した（ateam run 92ab2600d301）
READ P1 21/21 済／P2 9/21／P3 14/21／P4 21/21 済／P5 11/21／P6 8/21
RESULT READING exit=5 criteria=c7d29a41 もう一度打つと続きから進む

$ storyteller review clarity --path manuscripts/01/v3 --team      （数分後に同じ行）
PASS 工程3 読者 P1〜P6 が 10 章を読んだ。AI エージェントを終了した
HOLD P2 再問#S20 答え「昼寝のとき東、西と順に頬を寄せ、二人の言葉をそろえてお返ししていた」 項目「二人の言葉のずれをそろえていた」0.490 < 0.5
RESULT HOLD exit=3 criteria=c7d29a41 cells=264 stated=263 hold=1 missing=0
```

ループの中で読者にも読ませたいときは、条件文の行に `--team` を付ける。そのときは、ループのエージェントが本文を直すたびに、全部の AI エージェントが読み直す。

### 場面 3: 著者が保留を解く

```
$ storyteller review resolve --path manuscripts/01/v3 P2:S20:reask --accept --why "内容は合っている"
src/reviews/resolved.tsv に 1 行足した。criteria が c7d29a41 から 8be04a71 に変わった。/goal を張り直す。
```

模範解答を直すときは、`src/propositions/S20.ts` の `ask.answer` を書き換えて走らせ直す。読者は読み直さず、判定だけがやり直される。ループが直した本文の before/after は `git diff <ループを始めたコミット> -- src/drafts` で見る。

### 場面 4: 面白さと相談

```
$ storyteller review consult --path src/drafts/01/v3 "8章の山場が弱く感じる。削れる場面を相談したい"
READ AI エージェントを起動した（claude-code、codex、grok-build）
RESULT READING exit=5 もう一度打つと続きから進む

$ storyteller review consult --path src/drafts/01/v3 "8章の山場が弱く感じる。削れる場面を相談したい"
== codex（gpt-6.1-sol）
（AI エージェントの返答）
== claude-code（fable）
（AI エージェントの返答）
== grok-build
（AI エージェントの返答）
RESULT DONE exit=0 返答は .storyteller/review/r-41c07e2a/ にある
```

`interest` も同じ形で、同梱の観点を AI エージェントに渡す。どちらも合否を出さない。全部の AI エージェントが返答すると終了コード 0 で、`verdict` は `done` になる。相談は AI エージェントを起動することが目的なので、`--team` は要らない。AI エージェントに渡す本文は `--path` のファイルのままで、frontmatter と注記（`// FIXED:` など）を外さない。注記を外すと、著者が決めて足した文を削る案で、AI エージェントが合意してしまうためである。

## 形

### データの置き場所（同じものを 2 か所に書かない）

| もの | 置き場所 | git |
|---|---|---|
| 事実の文、本筋かどうか、問い、模範解答、再問の時点 | `src/propositions/<id>.ts`。`statement` は今のまま。`ask` 欄を足す | 入る |
| 期限章 | 持たない。本文の印 `<!-- shows: id:shown -->` が最初に出る章から導く | なし |
| 著者が解いた保留 | `src/reviews/resolved.tsv`（読者、問い、答えのハッシュ、模範解答のハッシュ、判断、理由） | 入る |
| 作品ごとの指示文の上書き | `src/reviews/prompts/` | 入る |
| 判定モデル、AI エージェントの名簿、ateam の場所（送信の許可を兼ねる）、止まったとみなすまでの時間 | `.storyteller.json` の `review` | 入る |
| AI エージェントの記録（ステップごとの返答）、起動の記録、判定のキャッシュ | `.storyteller/review/` | 入らない |
| どの run がどの作品のものかの記録 | 利用者のキャッシュのディレクトリ（作品の外） | 入らない |
| AI エージェントの作業ディレクトリ（読むファイルの写しを置く） | 一時ディレクトリの下に AI エージェントごとに作る（作品の外。上の記録とは別の場所） | 入らない |
| before/after と「確認待ち」 | 持たない。git の差分から導く | なし |

```ts
export const S23: Proposition = {
  id: "S23", statement: "…", authorTruth: true, resolutionPolicy: "may-remain-withheld",
  ask: {
    main: true,                       // 合否に入れる。false は報告だけ
    question: "姉の依頼と妹の依頼は、何が起きれば同じ一人で叶うとチエは考えたか。…",
    answer: { must: ["真ん中に入るのはジェンイーである", "…"], extra: "…" },   // 読者には渡さない
    reask: "now",                     // 最終章のあとに聞き直す時点。"at-deadline" は「（N章を読み終えた時点で）」を付ける
  },
};
```

今の読み込み（`mapProposition`）は知らない欄を無視するので、`ask` を足しても古いバイナリは壊れない。オブジェクトの中のコメントも読み飛ばす（`tsparse` の `skipTrivia`）。

### 1 回の実行（`review.Run`。打ち直すたびに、進める所まで進む）

1. 命題と原稿を読み、宣言から `Spec` を作る。セルは「読者の AI エージェント × 本筋の事実 × 問いと再問」で、v3 の AI エージェント 6 体なら 6 × 22 × 2 = 264 個になる。
2. 工程1。`MetaCheckService`（RDR-1xx）を呼ぶ。止まる条件の不備（本筋に shown の印・問い・模範解答・再問の時点が無い）も調べる。前者は `edit`、後者は `author`。
3. 判定モデルの設定を確かめる。`.storyteller.json` に `review.judge` が無ければ何も送らず、送る予定を出して `author`。
4. 工程2。本筋の事実ごとに、期限章までの本文と事実の文を判定モデルに渡す。0.2 未満なら `edit` で、AI エージェントは起動しない。事実の文は命題の `statement` である。
5. 工程3。今の本文・問い・指示文・名簿から run の id を導き、その run の AI エージェントの記録を見る。
   - 全部の AI エージェントが最後のステップまで済んでいれば、6 へ進む。
   - 生きている起動が無く、`--team` も無ければ、`author` を返す。AI エージェントは起動しない。
   - `--team` があるのに名簿（`review.agents` と `review.launcher`）が無ければ、送る予定を出して `author`。
   - `--team` があり、生きている起動が無ければ、名簿の AI エージェントを 1 体ずつ起動する。起動する前に、AI エージェントごとの作業ディレクトリを作り、読み方の指示（`README.md`）と 1 章の写しを置く。起動の文面は「作業ディレクトリの `README.md` を読んで、そのとおりに進める」という 1 文だけである。本文も作品の場所も入れない。
   - 起動が生きていれば、`--team` が無くても `--wait`（既定 90 秒）まで待つ。全部の AI エージェントが済めば AI エージェントを終了して 6 へ進む。済まなければ `reading` を返す。既定を 90 秒にするのは、Claude Code のコマンドの既定のタイムアウト（120 秒）より短くするためである。
   - ステップが 60 分進まない AI エージェントがあれば、その AI エージェントを終了して `error` を返す。`review turn` を一度も打たない AI エージェントも同じに扱う。60 分は既定の値で、`.storyteller.json` の `review.stallMinutes` で変えられる。ateam が起動の失敗を返したときは、待たずに `error` を返す。次に `--team` で打つと、その AI エージェントだけを新しい試行として起動し直す。起動し直した AI エージェントは 1 章から読み直す。起動し直すのは 2 回までである。
   - 本文か問いが変わると run の id が変わる。前の run の起動が生きていれば、先に閉じる。
6. 工程3b。宣言した全セルを判定モデルにかける。「不明」と答えたセルは `edit`。閾値未満のセルは保留で `author`。著者が解いた記録は、答えと模範解答のハッシュが同じときだけ効く。判定の失敗は `error`。
7. `verdict` と終了コードを 1 つ選ぶ。

AI エージェントの記録は run ごとに置く。本文を 1 字でも変えると run の id が変わり、全部の AI エージェントが読み直す。指紋を別のファイルに保存することはしない。

途中で止められたときと、同じ行が重なったときの扱いは次のとおり。

- 起動は AI エージェントごとに 1 回である。起動の id は、run の id と AI エージェントの名前と試行の回数から導く（例: `r-5be01c9a-P2-a2`）。起動する前に、試行の回数を起動の記録に書く。起動の文面は固定の 1 文なので、同じ試行では 1 バイトも変わらない。ateam の `dispatch` は、同じ id と同じ入力の再送では何も起動せず、保存した状態を返す（コードの読み。未検証）。だから、起動の途中で止められて次の実行が同じ id で呼び直しても、AI エージェントは二重に起動しない。起動の記録だけが残って起動されなかった AI エージェントは、`review turn` を一度も打たないので、止まった AI エージェントとして扱い、次の試行で起動し直す。
- run ごとにロックのファイルを作る。同じ行が同時に走ったら、後から来たほうは AI エージェントを起動せず、今の進み具合を `reading` で返す。

### AI エージェントが次のファイルを受け取るコマンド（`review turn`）

AI エージェントの作業ディレクトリにファイルを写すのは、`review.Run`（起動の前の 2 つ）と `review.Turn` だけである。`Turn` は前のステップの返答を受け取り、次に読むファイルを 1 つ写して、その名前を返す。

- clarity では、今の本文が工程1 を通り、工程2 の値が全部キャッシュにあって閾値以上のときだけ、ファイルを写す。`Run` と同じ関数で確かめる。
- 先のステップのファイルは写さない。前のステップの返答を受け取ってから、次のファイルを写す。前に写したファイルは残す。
- 出した返答は書き直せない。同じステップをもう一度出すと、同じ返事を返す。
- 問いの id が欠けた答えは受け取らない。
- 返答は AI エージェントごとに別のファイルへ足す。複数の AI エージェントが同じファイルに書くことは無い。
- clarity では、frontmatter と `<!-- -->` を空行にした写しを置く。行の位置は元のファイルと同じである。interest と consult では、そのままの写しを置く。
- 1 章を 1 つのファイルで置く。章のあとの問いも 1 つのファイルで置く。
- `review turn` は `--run` だけで作品を見つける。`Run` は AI エージェントを起動する前に、どの run がどの作品のものかを、利用者のキャッシュのディレクトリに書く。この記録は、AI エージェントの作業ディレクトリの中にも、その親のディレクトリにも置かない。AI エージェントが作業ディレクトリの周りを調べても、原稿の場所が出てこないようにするためである。

### 終了コード

| 終了コード | `verdict` | 意味 | 次に動く人 |
|---|---|---|---|
| 0 | `pass`、`done` | `pass` は、宣言した全セルが stated（clarity）か、指摘が 0（typo）。`done` は、全部の AI エージェントが返答した（interest・consult） | なし |
| 1 | `edit` | 本文を直す（工程1 の構造、工程2、「不明」のセル、typo の指摘） | ループのエージェント |
| 2 | `usage` | 呼び出しの誤り。未知のフラグと余分な引数も含む | 呼んだ側 |
| 3 | `author` | 著者の番（保留、止まる条件の不備、`--criteria` と違う、判定モデルか名簿の設定が無い、今の本文を読者がまだ読んでいない） | 著者 |
| 4 | `error` | 走れなかった（API の失敗、AI エージェントが止まった、tmux の外で AI エージェントを起動できない、textlint が無い） | 環境を直す人 |
| 5 | `reading` | AI エージェントがまだ読んでいる。本文を直さず、同じ行をもう一度打つ | ループのエージェント（待つだけ） |

`reading` を `edit` と同じ終了コードにしない。ループが途中で本文を直すと、全部の AI エージェントの読みが無効になるためである。

### 止まる条件の指紋（`criteria`）

`criteria` は、次のものを正規化した JSON の sha256 の先頭 8 桁である。

- 命題の `ask`・`statement`・`authorTruth`・`resolutionPolicy`
- 章ごとの態度の表と `reader_requires`
- AI エージェントの名簿（役とハーネスの割り当て。`local` のような別名は、解決する前の宣言のまま入れる）と、実際に使う指示文
- 判定の組（`Profile`）
- 著者が解いた保留

本文の文字は入れない。ループが本文以外を動かすと、`--criteria` と合わずに終了コード 3 で止まる。著者とエージェントを見分ける代わりに、著者が書いた条件文と比べる。別名を解決したあとのハーネスは PC ごとに変わるので、`criteria` には入れず、毎回の出力に出す。止まったとみなすまでの時間（`review.stallMinutes`）も、合否を変えないので `criteria` に入れない。

### 公開面

- CLI: `review <clarity|typo|interest|consult> [--path] [--team] [--criteria] [--dry-run] [--wait 秒] [--json] [指示]`、`review turn`（AI エージェントが打つ）、`review resolve`（著者が打つ）。
- Go: `review.Run`、`review.Turn`、`review.Resolve`。MCP の道具は同じ service を呼ぶ。
- 工程を飛ばすフラグ、読者を絞るフラグ、観測を受け取るフラグ、閾値やモデルのフラグは作らない。モデル・問いの組み方・閾値は一緒に測った 1 組（`Profile`）で、Go の定数にする。`--team` は工程を飛ばさない。AI エージェントを起動してよいかを決めるだけである。

### 読者の動かし方

AI エージェントは「役 × ハーネス」である。名簿は `.storyteller.json` に置く。

```json
"review": {
  "judge": "openrouter:google/gemini-decision-1",
  "launcher": {"ateam": "~/.agents/skills/ateam/scripts/ateam.sh"},
  "stallMinutes": 60,
  "agents": [
    {"agent": "P1", "runtime": "claude-code", "model": "claude-fable-5-1", "effort": "medium"},
    {"agent": "P2", "runtime": "codex",  "model": "gpt-6.1-sol", "effort": "medium"},
    {"agent": "P3", "runtime": "grok-build", "model": "grok-4.7", "effort": "medium"}
  ]
}
```

起動と、章の受け渡しを分ける。

- **起動**は `Launcher` が持つ。AI エージェントを「1 回の仕事」として起動し、終わったら終了する。最初の実装は ateam で、`ateam.sh dispatch`（名簿に無い AI エージェントを起動するコマンド）と `ateam.sh close` を呼ぶ。agmsg の `spawn.sh` は直に呼ばない。ハーネスごとの起動のやり直しと信用確認は、ateam がすでに持っている。
- **章の受け渡し**は、ファイルの写しと `review turn` で行う。storyteller が AI エージェントの作業ディレクトリへファイルを 1 つずつ写し、AI エージェントが読んで `review turn` を打つ。ハーネスの種類に依らない。

```go
// Launcher は AI エージェントを 1 体、1 回の仕事として起動する。本文は渡さない。
type Launcher interface {
    // id は起動の id。dir は AI エージェントの作業ディレクトリ（作品の外）。
    Launch(ctx context.Context, id, dir string, agent AgentLaunch) (LaunchHandle, error)
    Close(ctx context.Context, h LaunchHandle) error
}
type AgentLaunch struct {
    Agent, Runtime, Model, Effort string
    Prompt                       string // 固定の 1 文。本文も作品の場所も入れない
}
```

起動の文面に本文を入れないのは、ateam が文面を引数・stderr・状態ファイルに残すためである。AI エージェントが止まったかどうかは、ateam に聞かず、AI エージェントの記録（最後にステップが進んだ時刻）で判断する。同じ起動の id で `Launch` を 2 回呼んでも、AI エージェントは増えない。

AI エージェントの作業ディレクトリは、作品の外に作る。一時ディレクトリの下に、AI エージェントごとに 1 つ作る。置くのは、読み方の指示と、その AI エージェントがそこまでに読むファイルの写しだけである。前に読んだファイルは残す。AI エージェントごとに分けるのは、進みの速い AI エージェントのファイルを、ほかの AI エージェントが読まないようにするためである。ハーネスは作業ディレクトリにある指示のファイル（`CLAUDE.md`、`AGENTS.md` など）を読み込む。このディレクトリなら、先の章が AI エージェントの手元に無く、作品の指示も読み込まれない。利用者の全体の設定とフックは読み込まれる。これは storyteller からは切れない。作品の外のディレクトリで ateam が AI エージェントを起動できるかは未検証である。

ほかの起動の仕方（各 CLI のヘッドレス実行、ホストのエージェントが AI エージェントを起動する形）は、`Launcher` の別の実装として足せる。そのときも、章の受け渡しは、ファイルの写しと `review turn` のままである。

「storyteller が章を送って、返信を待つ」形は採らなかった。理由は 2 つある。ateam は 1 回の仕事に 1 回返す作りで、往復を繰り返す入口が並列に使えない。そして、返信して手が空いた AI エージェントを次の送信で起こせるのは Claude Code と Codex だけで、足したい Grok や Copilot では動かない見込みである（未検証）。

### 種類ごとの深さ

- clarity: 上のとおり。
- typo: `textlint.Worker` を 1 ファイルずつ呼び、指摘にファイル名とその行の引用を足す。textlint が無いときは `error` にする（今の `lint` は終了コード 0 で通る）。直すのはループのエージェントで、`--fix` は作らない。
- interest・consult: 継ぎ目だけ作る。起動と返し方は clarity と同じにする。AI エージェントの作業ディレクトリに、同梱の指示文と、利用者の指示（最後の位置引数）と、全章の写しを最初から置く。相談では先読みを気にしないためである。AI エージェントは読んで、`review turn` でレビューを 1 回返す。合否は出さない。全部の AI エージェントが返すと `done` になる。起動する AI エージェントは、interest が名簿の全部（役つき）、consult がハーネスの種類ごとに 1 体（役なし）である。consult の数は著者が決めた。interest の数は既定案である。複数観点の集計などは、測定が無いので作らない。

### 同梱する指示文

読者の役（P1〜P6）、読者への指示、interest の観点、consult の指示を `internal/service/review/prompts/` に置き、`go:embed` で同梱する。作品ごとの上書きは `src/reviews/prompts/` に同じ名前で置く。上書きは `criteria` に入るので、どの文面の結果かが分かる。改善は作品側の上書きで試してから storyteller へ PR で戻す。判定の問いの組み方は上書きの対象にしない。

### 外へ送る範囲（v3、AI エージェント 6 体、本筋 22 件）

| 送るもの | 送り先 | 回数 |
|---|---|---|
| 工程2: 期限章までの本文と事実の文 | OpenRouter の Decisions API | 22 回（約 2.7MB。概算） |
| 工程3b: 読者の答え・問い・模範解答 | 同上 | 780 回 = AI エージェント 6 体 × 2 × (22 件 + 必須項目 43 個) |
| 読者: 提出稿の全文と問い | AI エージェントごとのハーネスの先。Claude Code は Anthropic、Codex は OpenAI、Grok Build は xAI | AI エージェントの数だけ。名簿で決まる |

送り先は AI エージェントごとに違うベンダーになる。`--dry-run` は、AI エージェントごとの送り先を出す。

### 既存のコマンドとの関係

| コマンド | 扱い |
|---|---|
| `meta check` | 残す。review は同じ service を呼ぶ |
| `reader check` | 残す。観測 TSV から RDR-202〜206 とつまずきの箱を出す診断として使う。合否の入口にはしない。`review clarity` はこれを呼ばない |
| `lint` | 残す。`review typo` が同じ検査を持つ。消すかどうかは、受け入れ試験が通ったあとで著者に確かめる |
| prayground の gate.sh・gen-q.sh・judge-answers.py・decide-probe.py・pregate.sh・ledger-check.py | この案では消さない。消すかどうかは、受け入れ試験が通ったあとで著者に確かめる |
| prayground の verify-manuscript | 残す。`/goal` の条件文に `&&` で並べる |

### 受け入れ試験

- r2 の再生。API は呼ばず、AI エージェントも起動しない。`Launcher` は Fake にし、r2 の報告を章と問いの単位で `Turn` に出させる。判定は `judge-cache.jsonl` だけを引く Fake にし、外れたら試験を落とす。期待は、264 セルの判定が `r2/judge.tsv` と同じで、判定の照会 780 回が全部キャッシュに当たること。問いの文字列が 1 バイトでも違えば、ここで分かる。
- 壊し表（同梱の見本「雨夜の鍵」で 1 か所ずつ変える）。
  - 本文を直す → run の id が変わり、前の AI エージェントを終了する。`--team` があれば全部の AI エージェントが読み直し、無ければ `author`
  - 判定が全部失敗する → `error`
  - AI エージェントが 1 体止まる → `reading` のあと `error`。打ち直すと、その AI エージェントだけを起動し直す
  - AI エージェントがまだ読んでいる → `reading`（終了コード 5）
  - `--observations` を渡す → `usage`
  - 判定モデルの設定が無い → `author`、送信 0 回
  - `--team` が無く、読者の記録も無い → `author`、起動 0 回
  - `--team` があり、名簿が無い → `author`、起動 0 回
  - 起動の途中で止められた → 次の実行は同じ起動の id で呼び直し、AI エージェントは増えない。`review turn` を打たない AI エージェントは、止まった AI エージェントとして次の試行で起動し直す
  - 工程2 が 0.2 未満 → `edit`、起動 0 回。そのとき `Turn` は本文を出さない
  - `--criteria` を張って、保留を解く・印を下げる・模範解答を変える・名簿を変える → `author`
- `Turn` の表。先のステップを求める → 拒む。問いの id が欠けた答え → 拒む。同じステップを 2 回出す → 同じ返事。古い run の id → 拒む。
- Fake の `Launcher` は、起動の文面に本文が無いことを確かめる。`Turn` の試験は、写したファイルに frontmatter と `shows:` の印が無いことと、返答を受け取るまで次のファイルが作業ディレクトリに無いことを確かめる。
- 実機の試験。AI エージェントの起動を作ったあとで、手で 1 回行う。作品の本文は使わず、同じ大きさのダミーの文章を使う。確かめるのは 3 つである。3 種類のハーネスの AI エージェントを、作品の外のディレクトリで起動できる。約 36KB のファイルを最後まで読める（ファイルの末尾に置いた合い言葉を、AI エージェントが返答に書ける）。21 ステップを続けて呼べる。

## 合成の判断

ここは 1 版の判断の記録である。読者の動かし方は下の「2 版で変えたこと」で、AI エージェントをいつ起動するかは「3 版で変えたこと」で改めた。

候補は 2 つあった。候補 A は storyteller が読者も動かす。候補 B は読者をホストのエージェントに任せ、storyteller が章を 1 つずつ渡す。

候補 A をもとにした。1 つの関数が工程の順序・読者に渡す本文・問いを出す時点・判定を持つので、守りたい規則の多くが構造で成り立つ。公開面も小さい。候補 B は、MCP の道具 2 つとターンの決まりが公開面に増える。AI エージェントの道具を絞れるかもホスト次第だった。

候補 B からは次のものを取り込んだ。

- 問いと模範解答を命題の `ask` 欄に置く。事実の文・問い・模範解答が 1 つのファイルに並ぶので、食い違いを見つけやすい。候補 A は事実の文を捨てて、模範解答を本文に問う形だった。
- 期限章を印から導く。v3 の事実 54 件すべてで、今の期限章と、最初に shown の印が出る章が一致した（2026-11-15 に確認）。
- モデル・問いの組み方・閾値を 1 組（`Profile`）にする。
- 終了コードで次に動く人を分け、`verdict` で示す。
- 読者の返答を git に入れない。

次のものは採らなかった。

- 候補 A の「読者の返答を途中の章から使い回す」。AI エージェントは 1 つの会話で読み進めるので、途中から再開できない。
- 候補 A の `reader check` の削除と、候補 B の `reader check`・`lint` の即時の削除。`reader check` は main に入れたばかりなので、診断として残す。
- 候補 B の「模範解答が未確認」の検査。CLI は誰が確認したかを見分けられない。

別系統のモデルによる審査は省いた。この環境で起動できるのは Claude 系だけだったためである。候補は opus と fable が 1 つずつ描いた。

### 2 版で変えたこと（2026-11-15）

1 版は、読者を外部コマンド（`claude -p`）で storyteller が直接動かす形だった。著者の決定で、読者は agmsg（ateam）で起動する、種類の違うハーネスにした。変えたのは次の点である。

- 読者の interface を「会話を開いて章を送る」形から、「AI エージェントを 1 回の仕事として起動する」（`Launcher`）と「AI エージェントが章を受け取りに来る」（`review turn`）に分けた。章を受け取りに来る形は候補 B が描いていたもので、ここで採った。
- `review` は 1 回で終わらなくなった。打ち直すたびに進む形にし、「まだ読んでいる」（終了コード 5）を足した。
- AI エージェントはシェルとファイルを持つ。1 版で「構造で起きない」とした先読みは、頼みごとに戻った。
- 送り先が AI エージェントごとに違うベンダーになった。

候補を描き直す並行の作業は省いた。agmsg と ateam の事実（上の 2 つ）で、章を送る形が落ちたためである。

### 3 版で変えたこと（2026-11-15）

2 版では、ループの中で読者にも読ませていた。`review clarity` を打つと、工程1 と工程2 のあとで AI エージェントが必ず起動した。これを、もう 1 つの形と比べた。

| | ループの中で読者にも読ませる（2 版） | ループは工程2 まで。読者には著者が読ませる（3 版） |
|---|---|---|
| ループの 1 回 | AI エージェントを待つ。本文を判定モデルと、AI エージェントごとのベンダーに送る | AI エージェントを待たない。本文を判定モデルに送る（判定のキャッシュに無い分だけ） |
| 同じ本文に同じ結果が出るか | 読者の答えは読むたびに変わる。同じになるのは、同じ run の中だけ | 出る |
| 終了コード 0 に届くか | 保留が 1 回目のパネルで 2 セル、2 回目で 4 セル出た。ほぼ毎回、著者の番で止まる見込みである | ループは「読者はまだ読んでいない」で止まり、著者に渡る |
| 読者の「不明」をループのエージェントが自動で直す | できる | 著者が条件文に `--team` を書けば、できる |

3 版は右の形を既定にした。著者がこの形に決め、フラグの名前を `--team` にした。コマンドは 1 つのままで、`--team` を付けたときだけ AI エージェントを起動する。`--team` は工程を飛ばさないので、「判定の工程より先に読者を起動した」失敗は起きない。左の形は、著者が条件文に `--team` を書けば使える。

ほかに変えたのは次の点である。

- AI エージェントを、作品の外のディレクトリで起動する。storyteller が、読むファイルを 1 つずつそこへ写す。前に読んだファイルは残す。本文を `review turn` の出力で渡す形はやめた。これは著者の決定である。
- 起動を AI エージェントごとに分けた。作業ディレクトリを AI エージェントごとに作るためである。
- 面白さと相談の使い方を書いた（場面 4）。
- 起動の途中で止められたときの扱いを直した。2 版は「同じ id で呼び直すので、AI エージェントは二重に起動しない」とだけ書いていた。ateam は同じ id の再送で残りの AI エージェントを起動しないので、`review turn` を打たない AI エージェントを、止まった AI エージェントとして扱う。
- `lint` と prayground のスクリプトを消すことを、この案から外した。

## 受け入れたトレードオフ

- AI エージェントはシェルとファイルを持つ。作業ディレクトリは作品の外で、先の章を置かない。しかし、原稿の場所やほかの AI エージェントのディレクトリを見つければ開ける。先の章や原稿のファイルを開かないことは、頼みごとのままになる。その代わり、ハーネスの違う読者を入れられる。
- 既定のループは読者まで進まない。読者の「不明」をループのエージェントが自動で直すには、著者が条件文に `--team` を書く必要がある。その代わり、既定のループは同じ本文に同じ結果を出し、AI エージェントを待たない。
- 読者を動かすハーネスが変わる。ファイルを開いて読む点は今と同じである。今までの 2 回のパネルの結果は読者の工程には引き継げない。
- tmux か Herdr の中でしか AI エージェントを起動できない。ateam と agmsg が入っている必要がある。
- `--team` を付けた `review` は 1 回で終わらない。AI エージェントが読んでいるあいだは `reading` を返し、打ち直しを求める。
- 本文を 1 字直すと、読者の記録は使えなくなる。読ませ直すと、全部の AI エージェントが全章を読み直す。1 回の読みは数分から数十分かかる。その代わり、「本文を変えたら読み直す」がそのまま構造になる。
- 本文を複数のベンダーに送る。
- 保留は毎回著者に戻り、解くたびに `/goal` を張り直す。本文を直して読ませ直すと、読者の答えが変わるので、著者が解いた記録は効かなくなる。模範解答を広げた分は残る。その代わり、ループの中で止まる条件が変わらないことを検査できる。
- 閾値と問いの組み方を作品ごとに変えられない。値が入力の形で動くので、測っていない組を使わせない。
- 模範解答は命題ごとに 1 つで、版ごとには持たない。前の版の模範解答は git の履歴にある。
- 読者の返答は git に入らない。`.storyteller/review/` を消すと、合格を確かめ直すには読み直しが要る。
- `reader check` が残るので、未受領（RDR-201）を出す道が 2 つになる。合否を出すのは review だけ、と文書に書く。
- 本筋以外の事実は合否に入れず、工程2 にも掛けない。今の verify.sh が見ているアンカー文の退行は review に移らない。
- 提出稿が執筆稿と同じかどうかは storyteller が見ない。条件文に verify-manuscript を並べる 1 行に頼る。

## 検討した別案

- **工程ごとに別のコマンド**（`review probe`、`review read`、`review judge`、`review gate`）。各コマンドは単純になる。しかし順序を呼ぶ側が覚えることになり、「判定の工程より先に読者を起動した」失敗がそのまま残る。
- **storyteller が章を送って、返信を待つ**。先読みなしを構造で守れる。しかし手が空いた AI エージェントを起こせるハーネスが限られ、ateam の作りにも合わない（「読者の動かし方」の節）。
- **各 CLI のヘッドレス実行を storyteller が直接呼ぶ**。tmux が要らない。しかしハーネスごとの起動の違いを storyteller が持つことになる。ateam の文書は、Grok Build を単発・ヘッドレス実行へ置き換えないよう書いている。`Launcher` の別の実装として、あとから足せる。
- **報告ファイルを取り込む**（今の延長）。実装は小さい。しかし先読みなし・全問回答が読者への指示に残り、取り込みの入口が手書きの観測の入口にもなる。
- **止まる条件を git のコミットで固定する**。before/after と同じ仕組みで済む。しかし storyteller が git を起動する必要があり、どのファイルが止まる条件かの一覧を別に持つことになる。指紋ならファイルから計算できる。
- **問いと模範解答を版ごとに 1 つのファイルにまとめる**（`src/drafts/<作品>/<版>/clarity.ts`）。版ごとの違いを素直に持てる。しかし事実の文と命題が離れ、問いと `statement` を見比べにくくなる。

## 著者に決めてもらう点

残っていない。下の「既定案」は、著者がまだ確かめていない。

## 著者が決めたこと（2026-11-15）

1. 依頼の読みは合っている。agmsg で起動する AI エージェントを前提にし、ほかの起動の仕方は、足せる形にとどめる。最初に作るのは ateam での起動だけである。
2. 既定の名簿は、6 つの役を 3 種類のハーネスに 2 つずつ割り当てる。まず使ってみて見直す。
3. AI エージェントがコマンドで章を受け取れるかを、ハーネスごとに AI エージェント 1 体で測る。この測定で本文を外部に送ることは、著者が許可した。
   測定の結果（2026-11-15）。Claude Code（claude-fable-5-1）・Codex（gpt-6.1-sol）・Grok Build（grok-4.7）の AI エージェントを 1 体ずつ ateam の `dispatch` で起動し、仮の `review turn` で提出稿の 1〜2 章を渡した。ステップは 3 つ（1 章の記録、2 章の記録、2 章の問い 4 件）である。3 体とも 4 回の呼び出しで終わり、やり直しは無かった。2 章の出力は約 25KB で、3 体とも末尾の合い言葉を記録に書けたので、出力は切られていない。記録と答えは、3 体ともヒアドキュメントで stdin に渡せた。最初の呼び出しから最後の返答までは、Codex が 24 秒、Claude Code が 51 秒、Grok Build が 76 秒だった。そのあと、本文をファイルで渡す形に変えた（下の 6）。コマンドの出力では渡さないので、出力の大きさの結果は使わない。コマンドを続けて呼べたことと、stdin で渡せたことは、そのまま使う。測っていないことは受け入れ試験の「実機の試験」に回し、ダミーの文章で確かめる。AI エージェントが原稿のファイルを自分で開いたかは、確かめる手段が無い。
4. `local` が devin に解決される PC で AI エージェントを起動できない見込みであること（未検証）は、問題にしない。
5. AI エージェントを起動するのは、`--team` を付けたときだけにする。付けないループは工程2 までで止まり、読者に読ませるかどうかは著者が決める。既定のループが本文を送る先は、判定モデル（OpenRouter）だけである。
6. AI エージェントは、作品の外のディレクトリで起動する。storyteller が、読むファイルを 1 つずつそこへ写して読ませる。前に読んだファイルは、残っていてよい。
7. 工程2 で判定モデルに渡す事実の文は、命題の `statement` にする。今の工程2 が渡しているのは `facts.tsv` の事実の文で、本筋 22 件のうち 11 件で `statement` と違う（多くは `facts.tsv` 側だけにある括弧の但し書き）。括弧の有無で値が大きく動くことは測ってある。だから、prayground を移すときに、11 件の `statement` を `facts.tsv` の文に書き換える。測った値がそのまま使える。書き換える文は、著者が 1 件ずつ確かめる。
8. AI エージェントのステップが 60 分進まなければ、止まったとみなす。Fable などのモデルでは 10 分では足りないためである。この時間は設定ファイルで変えられるようにする。起動し直すのは 2 回までにする。
9. 「不明」と答えたセルは、著者を通さずに「本文を直す」（`edit`）へ回す。
10. 模範解答は命題ごとに 1 つ置く。版ごとには持たない。
11. consult で起動する AI エージェントは、ハーネスの種類ごとに 1 体（役なし）にする。

## 既定案（著者はまだ確かめていない）

案を書いた側が選んだもので、著者の決定ではない。

- `reader check` は診断として残す。`lint` と prayground のスクリプトは、この案では消さない。prayground では文書とスキル 17 ファイルが `reader check` と `lint` に触れている。
- 読者の返答は git に入れない。
- 本筋以外の事実の検査（アンカー文）は、prayground の verify.sh に残す。
- storyteller は、読者に渡す本文から `//` で始まる行を消さない。clarity には、注記を外した提出稿を `--path` で渡す。
- before/after は git の差分で見る。review は「どの指摘でどの行を直したか」の一覧を出さない。
- 2 回目のパネルの再生試験は、未公開の本文と答えを使う。データは prayground に置き、環境変数で場所を渡す。
- 模範解答が古い台詞のまま残る失敗には、「全部の AI エージェントが同じセルで保留のとき、見比べるよう促す」だけで応じる。模範解答を本文に問う検査は、測っていないので足さない。
- interest で起動する AI エージェントは、名簿の全部（役つき）にする。

## 最初の実装の一歩

`Spec`（セルの列挙と `criteria`）と、判定の問いの組み立てを純関数で書く。Fake の判定に `judge-cache.jsonl` を引かせて、2 回目のパネルの 264 セルが `r2/judge.tsv` と同じ判定になり、照会 780 回が全部キャッシュに当たるところまでを最初に作る。AI エージェントの起動（`Launcher`）を作ったら、受け入れ試験の「実機の試験」をダミーの文章で 1 回行う。

## 付録 1: 規則と失敗の扱い

「構造」は起きない。「検査」は起きたら落とす。「見える」は出力か git に出るだけ。「扱わない」は storyteller からは分からない。

| 項目 | 扱い | どう守るか |
|---|---|---|
| 合格と書けるのは通ったときだけ | 検査 | 終了コード 0 は全セルが stated のときだけ。報告に何と書くかは扱わない |
| 読者は工程1・工程2 のあと | 構造 | `Turn` は、工程1 と工程2 を通った本文しか写さない。AI エージェントを起動するのも `Run` の中だけ |
| 読んだのは今の本文 | 構造 | run の id を今の本文から導き、その run の AI エージェントの記録だけを判定する |
| 本筋の判定が全読者でそろう | 構造 | セルを宣言から列挙する。最後のステップまで済んでいない AI エージェントがあれば、判定に進まない |
| 判定は判定モデルが出したもの | 構造＋扱わない | 観測を渡す入口が無い。キャッシュのファイルに手で値を書くことは扱わない |
| 保留を解くのは著者 | 検査＋見える | `--criteria` を張ったループの中で解くと終了コード 3。張っていないときは `resolved.tsv` の差分に出るだけ |
| 模範解答・事実・宣言を緩めない | 検査＋見える | 同上。印の態度を下げる、印を別の章へ動かす、も `criteria` が変わる |
| エージェントが入れた文は確認待ち | 扱わない | git の差分とコミットに任せる |
| 判定より先に読者を起動した | 構造 | 「読者は工程1・工程2 のあと」と同じ |
| 抜き出し役の観測が揺れた | 構造 | 抜き出し役が無い。AI エージェントが問いの id ごとに答え、id の欠けた答えは受け取らない |
| 模範解答が古い台詞のまま | 見える | 全部の AI エージェントが同じセルで保留のとき、見比べるよう促す |
| 問いと事実の文が食い違う | 見える | `statement`・問い・模範解答が 1 つのファイルに並ぶ |
| 再問が時点を指定しない | 検査 | 本筋の `ask.reask` を必須にする。無ければ止まる条件の不備 |
| 行の無い読者・章を判定しない | 構造 | 「全読者でそろう」と同じ |
| 問いだけ作り直すと通った | 構造 | 指紋を保存しない。問いが変われば run の id が変わる |
| 読者に印と frontmatter が見える | 構造 | 渡す本文から外す |
| 読者が先の章やファイルを開ける | 扱わない | `Turn` は先のステップのファイルを写さない。AI エージェントの作業ディレクトリは作品の外で、先の章を置かない。しかし AI エージェントはシェルを持つので、原稿の場所やほかの AI エージェントのディレクトリを見つければ開ける。指示で頼むだけになる |
| AI エージェントが読まずに答える、親が代わりに答える | 扱わない | 答えは判定モデルを通るが、模範解答を知る者が書けば通る |
| 本文を外部に送る | 検査＋見える | `.storyteller.json` に判定モデルの設定が無ければ、送らない。名簿が無いか `--team` が無ければ、clarity の AI エージェントを起動しない。AI エージェントごとの送り先は毎回出す。誰が許可を書いたかは見分けられない |

## 付録 2: 型のスケッチ

```go
// package review（internal/service/review）。本体は未実装。

type Kind string    // "clarity" | "typo" | "interest" | "consult"
type Verdict string // "pass" | "done" | "edit" | "author" | "error" | "usage" | "reading"

type Request struct {
    Kind        Kind
    Path        string // 原稿のディレクトリ
    Team        bool   // clarity だけ。AI エージェントを起動してよい。false なら、読者の記録が無いとき author で止まる
    Criteria    string // 空でなければ、今の criteria と違うときに author で止まる
    DryRun      bool   // 送る予定だけを出す
    Wait        time.Duration // AI エージェントを待つ長さ。既定 90 秒
    Instruction string // interest・consult だけ。clarity・typo に渡すと usage
}

// Run は、進める所までレビューを進める。工程の順序、AI エージェントの起動と片づけ、全セルの判定を中に持つ。
// AI エージェントがまだ読んでいれば reading を返す。打ち直すと続きから進む。
func Run(ctx context.Context, req Request, deps Deps) Report { panic("not implemented") }

// Turn は前のステップの返答を受け取り、次に読むファイルを AI エージェントの作業ディレクトリへ写す。
// 工程1・工程2 を通った本文しか写さない。先のステップのファイルは写さない。出した返答は書き直せない。
func Turn(ctx context.Context, req TurnRequest, deps Deps) TurnReply { panic("not implemented") }

type TurnRequest struct {
    Run, Agent string
    Step      int               // 返答を出すステップ。1 から始まる
    Notes     string            // 章を読んだあとの記録
    Answers   map[string]string // 問いの id → 答え。id が欠けたら受け取らない
}
type TurnReply struct {
    Step, Of int
    File     string   // 次に読むファイルの名前。作業ディレクトリに写してある
    Asks     []string // このステップで答える問いの id
    Done     bool
    Error    string
}

// Resolve は著者の判断を 1 件、src/reviews/resolved.tsv に足す。
func Resolve(ctx context.Context, req ResolveRequest, deps Deps) Report { panic("not implemented") }

type Report struct {
    Kind     Kind      `json:"kind"`
    Verdict  Verdict   `json:"verdict"`
    Stage    string    `json:"stage,omitempty"` // "structure" | "probe" | "read" | "judge"
    Criteria string    `json:"criteria,omitempty"`
    Findings []Finding `json:"findings"`
    Holds    []Hold    `json:"holds,omitempty"`
    Cells    *Tally    `json:"cells,omitempty"` // declared, stated, resolved, hold, missing
    Sent     *Sent     `json:"sent,omitempty"`  // 送り先、回数、バイト数、キャッシュの当たり
    Run      string    `json:"run,omitempty"`
    Agents    []AgentProgress `json:"agents,omitempty"` // AI エージェント、解決後のハーネス、進んだステップ、済んだか
    Error    string    `json:"error,omitempty"`
}

// Finding は 4 種類で共通の指摘。Quote は本文の引用で、章と行だけでは指さない。
type Finding struct {
    Code, Severity string
    File           string
    Line           int
    Quote, Message string
    Fact           string // clarity だけ
    Blocking       bool
}

type Ref string // "ask" | "reask"
type Cell struct {
    Agent, Fact string
    Ref        Ref
}
type Hold struct {
    Cell             Cell
    Question, Answer string
    Key              Key
    Whole            float64
    Items            []float64
}

// domain.Proposition に足す欄。
type Ask struct {
    Main     bool
    Question string
    Answer   Key
    Reask    string // "now" | "at-deadline"。本筋では必須
}
type Key struct {
    Must  []string
    Extra string
}

// Spec は宣言から作る。合否を決める入力は、これと本文と返答と判定の値だけ。
type Spec struct {
    Agents    []Agent
    Asks     []FactAsk       // 命題 id、期限章（印から導く）、Ask
    Chapters []ChapterStance // service.WalkStances の結果
    Profile  Profile
}

func (s Spec) Cells() []Cell    { panic("not implemented") } // AI エージェント × 本筋 × {ask, reask}
func (s Spec) Criteria() string { panic("not implemented") } // 本文の文字は入れない

// Profile は一緒に測った 1 組。ばらばらに変える設定は作らない。
type Profile struct {
    Name, JudgeModel            string
    ProbeMin, WholeMin, ItemMin float64 // 0.2, 0.6, 0.5
}

type Decider interface {
    Decide(ctx context.Context, model, state, instructions string) (float64, error)
}

// Launcher は AI エージェントを 1 体、1 回の仕事として起動する。本文は渡さない。最初の実装は ateam。
type Launcher interface {
    Launch(ctx context.Context, id, dir string, agent AgentLaunch) (LaunchHandle, error)
    Close(ctx context.Context, h LaunchHandle) error
}

// 純関数。問いの文字列は今の Python と同じバイト列にする（キャッシュの鍵が同じになる）。
func probeQueries(spec Spec, text ReaderText) []Query                              { panic("not implemented") }
func judgeQueries(spec Spec, answers Answers) []Query                              { panic("not implemented") }
func decide(spec Spec, answers Answers, values Values, resolved []Resolution) Matrix { panic("not implemented") }
```

storyteller で足す・変えるファイルは次のとおり。

- `internal/service/review/`（新設。`prompts/` を含む）
- `internal/cli/modules/review/`（新設）と `internal/cli/modules/index.go`
- `internal/external/decisions/`（新設。`net/http` を使うのはここだけ）
- `internal/external/ateam/`（新設。`ateam.sh dispatch` と `close` を呼ぶ `Launcher`）
- `internal/domain/proposition.go` と `internal/project/entity/loader.go`（`ask` 欄）
- `src/type/v2/proposition.ts`（型の定義の元）
- `docs/review.md`（新設）と `docs/clarity.md`（「LLM は外で動く」の決定を改める）
