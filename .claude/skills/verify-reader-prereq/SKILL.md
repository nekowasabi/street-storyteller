---
name: verify-reader-prereq
description: Clarity（わかりやすさ）の設計（docs/designs/reader-prereq-sketch.ts。Proposition を新しい要素種別に、Disclosure と Requires を原稿 frontmatter の reader_shows / reader_requires に置き、各章を読むのに要る前提が提示順でより前の章で読者へ渡っているかを検査する）を TLA+ で検査する。スケッチを変えた、原稿 frontmatter の型を変えた、この検査を service に実装する前後、提示順（章順）の扱いを変えたときに使う。
---

# verify-reader-prereq

対象は設計であり、まだ製品コードではない。モデルは `docs/designs/reader-prereq-sketch.ts` を写したもので、検査の合格は「スケッチの物語がこの 3 つの規則を満たす」ことまでを言う。用語は `docs/glossary.md`、経緯は `docs/clarity.md`。`internal/service/` に `ReaderPrereqService` が実装されたら、その時点で `/maintain-formal-verification-skill` を走らせ、モデルが実装の 1 手順を 1 手順として写しているかを確かめてから、下の同期コミットを進める。

## 守る性質と、破れたときの害

性質は 3 つ。いずれも設計比較文書の RDR 診断に対応する。

- **前提は先に渡す（RDR-102, `PrereqBeforeUse`）**: 章の `reader_requires` に書いた命題と態度は、提示順でより前の章の `reader_shows` に現れている。態度が null（モデルでは `"any"`）の要求は、その命題が何らかの態度（`withheld` を含む）で開示されていれば満たす。
  害: 読者がまだ受け取っていない事実に場面が寄りかかり、面白い以前に「分からない」で読みが止まる。
- **訂正は誤信のあと（RDR-103, `CorrectedAfterMisled`）**: ある命題が `corrected` になるのは、同じ命題で読者が一度 `misled` になったあとだけ。前の章の開示か、同じ章の列でより前の開示を見る。
  害: 誤信していないものを「訂正」しても読者には何も起きない。設計データの書き間違いの検出。
- **偽の命題は最後までに訂正する（RDR-104, `MustCorrectAtEnd`）**: `resolutionPolicy` が `must-correct-if-false` の命題は、最後の章を読んだ時点で `corrected` になっている。
  害: 作者が「必ず正す」と決めた誤信が残ったまま物語が終わる。

意図した謎（`withheld`）と意図した誤信（`may-remain-misled`）は欠陥にしない。宣言の無い未開示だけが落ちる。

## 道具

TLA+ と TLC。提示順という「順序」の問題なので、小さなモデルで全経路を調べる模型検査が最も安い。結果はすべて pstack の `/statechart` スキルで読む。コマンドと置き場所はそのスキルの版に従い、ここには写さない。

## 走らせ方

1. `/statechart` の手順どおり、リポジトリ外の作業フォルダに `statechart/ReaderPrereq.tla`、`ReaderPrereq.cfg`、`view.mjs` を写す。
2. `ReaderPrereq.cfg`（本編の提示順 `Variant = "main"`）で走らせる。期待は 3 規則と NoDeadlock が成立、5 状態。
3. `ReaderPrereqFlashback.cfg`（ch-03 を ch-02 より前に置く別案）で走らせる。期待は `PrereqBeforeUse` が 2 手で破れる（ch-01 を読む → ch-03 を読む）。これは規則が検査できていることの確認で、欠陥ではない。
4. 出てきた `chart.mmd` と `report.md` を `statechart/` の同名ファイルと diff する。差があれば、スケッチかモデルのどちらが変わったかを読む。
5. 本編と別案を 1 枚の図にしたいときは、`ReaderPrereqBoth.tla` を `ReaderPrereqBoth.cfg` と `viewBoth.mjs` で走らせる。期待は 10 状態、`PrereqBeforeUse` が別案の経路（ch-01 を読む → ch-03 を読む [別案]）でだけ破れる。出力は `chart-both.mmd` と `report-both.md` と diff する。このモデルは図のためのもので、規則と設計データは `ReaderPrereq.tla` と同じにしておく。片方を変えたらもう片方も直す。

所要は数秒。

## 落ちたとき: 設計の欠陥か、モデルの都合か

1. 破れた規則の最短経路を読む。最後の手が「読者が ch-NN を読む」なら、その章の `reader_requires` と、それより前の章の `reader_shows` をスケッチで開く。
   - 前提が本当に前の章に無い → 設計の欠陥。直すのはスケッチ（`reader_shows` を前の章に足す、または `reader_requires` を外す、または命題を `withheld` と宣言する）。規則を弱めない。
   - スケッチには在るのにモデルに無い → モデルの都合。`ReaderPrereq.tla` の `Shows` / `Requires` / `Policy` をスケッチからもう一度写す。
2. スケッチを変えたら、必ず `Shows` / `Requires` / `Policy` を手で合わせる。生成器は無い。
3. 意図して規則を変えるときは、規則の文とこのファイルの性質の節を同時に直し、変えた理由を書く。

## 落ちる検証を見た記録（2026-11-07）

モデル（`.tla`）の写しに次の 3 つの壊し方を入れ、それぞれ対応する規則だけが破れることを確かめた。壊したのはスケッチ（`.ts`）ではなくモデル側で、`Shows` は手で写すので同じ壊し方に当たる。章単位に書き直した版で再実行し、同じ結果を得た。

| 壊し方 | 破れた規則 | 最短経路 |
|---|---|---|
| ch-02 の `reader_shows` を空にする | `PrereqBeforeUse` | ch-01 → ch-02 → ch-03 を読む（3 手） |
| ch-04 の `loc: misled` を消す | `CorrectedAfterMisled` | ch-01 → ch-02 → ch-03 → ch-04（4 手） |
| ch-04 の `loc: corrected` を消す | `MustCorrectAtEnd` | ch-01 → ch-02 → ch-03 → ch-04（4 手） |
| ch-04 の列を `corrected, misled` の順に逆転する | `CorrectedAfterMisled`（最後の態度が `misled` になるので `MustCorrectAtEnd` も） | ch-01 → ch-02 → ch-03 → ch-04（4 手） |
| ch-02 の `hist: withheld` を消す（ch-03 は `hist` を態度 null で要求） | `PrereqBeforeUse` | ch-01 → ch-02 → ch-03（3 手） |

壊しを戻した本編は 3 規則すべて成立、5 状態 5 遷移。

モデルを書く途中で、スケッチの ch-04 に `loc: misled` が無く `corrected` だけが書かれていたのを `CorrectedAfterMisled` が拾った。設計比較文書の追跡表（提示 7 で誤りの露見、提示 8 で訂正）に合わせてスケッチを直した。

## カバレッジと同期コミット

- 対象（設計）: `docs/designs/reader-prereq-sketch.ts` の `propositions` と `manuscripts` 全体。
- 対象（コード）: `internal/meta/frontmatter.go` の FrontMatter（`characters` / `settings` / `foreshadowings` / `timeline_events` / `phases` / `timelines`）。`reader_shows` / `reader_requires` はまだ無い。`PlotBeat` は変えない設計なので対象に含めない。
- 実装: `internal/service/reader_prereq.go` の `ReaderPrereqService.Run`（2026-11-07）。モデルの `ReadChapter` は、この関数の `for _, f := range files` の 1 周（原稿 1 ファイル）に対応する。`Shows` / `Requires` は `internal/service/testdata/clarity_rainkey/manuscripts/` の frontmatter と同じ内容で、`reader_prereq_test.go` の壊し版 6 通りがこのスキルの「落ちる検証を見た記録」の表と一致することを確認した。`/maintain-formal-verification-skill` での読み直しと同期コミットの更新は、実装がコミットされてから行う。
- 同期コミット（コード側）: `2872dc9`（2026-11-07 に、FrontMatter に上の 6 欄だけがあることを確認）。
- 同期コミット（設計側）: 未確定。`docs/designs/reader-prereq-sketch.ts` とこのスキルは 2026-11-07 時点で未コミット。これらを最初に取り込んだコミットが設計側の同期点になるので、取り込んだらここに書く。本編が 3 規則を満たすことは、そのスケッチの内容で確認した。
- 対象のファイルが同期コミットより後に変わったら、検査を走らせたうえで、モデルがスケッチと型を言い表しているかを読んで確かめる。確かめてから、この行の同期コミットを進める。検査が通っただけでは進めない。

## 範囲外

- 提示順は `manuscripts/` のファイル名順と決めた（2026-11-07）。モデルは 4 章の固定順しか持たず、回想（Event の世界時間と提示順のずれ）は `Variant = "flashback"` の 1 例しか見ていない。複数 plot は章の順にしか影響しないので、モデルに plot は無い。
- 同じ章の `reader_shows` の列の中の順序は `CorrectedAfterMisled` だけが見る。`reader_requires` は章の先頭で評価するので、同じ章の開示では満たせない。
- 読者が実際に前提を結びつけられたかは検査できない。合格は「宣言した前提が提示順で揃っている」ことまで。
- `preconditionBeatIds` の循環検出は対象外。`docs/plot.md` は DFS で検出すると書いているが、`internal/` にその実装は無い（2026-11-07 時点、未修正）。

## ファイル

- `statechart/ReaderPrereq.tla` モデル。`Shows` / `Requires` / `Policy` がスケッチの写し。
- `statechart/ReaderPrereq.cfg` 本編。`statechart/ReaderPrereqFlashback.cfg` 別案。
- `statechart/view.mjs` 状態と遷移の日本語ラベル。題名に全角の括弧や句点を入れると mermaid の表題が崩れるので半角にする。
- `statechart/chart.mmd`、`statechart/report.md` 本編の最新の出力。
- `statechart/ReaderPrereqBoth.tla`、`ReaderPrereqBoth.cfg`、`viewBoth.mjs` 本編と別案を分岐させた 1 枚図用のモデル。出力は `chart-both.mmd`、`report-both.md`。
