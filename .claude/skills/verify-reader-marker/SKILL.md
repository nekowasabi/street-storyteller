---
name: verify-reader-marker
description: Clarity の方法 1（原稿本文に `<!-- shows: 命題ID:態度 -->` の印を置き、frontmatter の reader_shows と突き合わせる RDR-105）の設計を TLA+ で検査する。検査が合格した原稿は、本文の印の順で読んだ読者にも RDR-102〜104 が成り立つか（見逃しが無いか）、印と申告が揃っているのに落とさないか（空振りが無いか）を、frontmatter と本文の全組み合わせ（2 章・長さ 2 まで）で調べる。本文の印の解析、RDR-105、internal/service/reader_prereq.go の章内順序・最後の態度の出所を実装・変更するとき、印の書式や比べ方を変えるときに使う。
---

# verify-reader-marker

## 守る性質と、破れたときの害

読者が実際に受け取る順序は、本文の印の出現順である。frontmatter の `reader_shows` は作者の申告にすぎない。

- **見逃しが無い（`Sound`）**: 検査（RDR-102〜105）が合格した原稿は、本文の印の順で読んだ読者にも RDR-102〜104 が成り立つ。
  害: 本文では訂正が誤信より先に来ている、または最後に誤信のまま終わっているのに、検査が通ってしまう。作者は直す機会を失う。
- **空振りが無い（`NoFalseAlarm`）**: 本文の順で問題が無く、frontmatter が印と同じものを申告しているなら、検査は落とさない。
  害: 正しい原稿が `manuscript build` で止まり、作者が検査を無視するようになる。

## 検査で分かったこと（2026-11-07）

比べ方を 3 通り用意し、全組み合わせで調べた（`CONSTANT Compare`）。

| 方式 | 内容 | `Sound` | `NoFalseAlarm` |
|---|---|---|---|
| `set` | RDR-105 を集合で比べ、章内順序と最後の態度は frontmatter の列で見る。今の `Run` に集合比較を足しただけの形 | **破れる** | **破れる** |
| `sequence` | RDR-105 を列で比べる | 成立 | **破れる** |
| `body` | RDR-105 を集合で比べ、章内順序（RDR-103）と最後の態度（RDR-104）は本文の印の列で見る | 成立 | 成立 |

- `set` の見逃し（2 手）: loc を must-correct-if-false とする。ch-02 の frontmatter が `[loc:misled, loc:corrected]`、本文の印が corrected → misled の順。集合は一致し、RDR-103 も RDR-104 も frontmatter の順で通る。読者は誤信する前に訂正を読み、誤信したまま物語を終える。
- `set` の空振り: frontmatter が `[loc:corrected, loc:misled]`、本文が misled → corrected の順。読者には問題が無いのに、frontmatter の順で RDR-103 が落ちる。
- `sequence` の空振り: frontmatter が `[loc:shown]`、本文に `loc:shown` の印が 2 回ある。読者には問題が無いのに、列が一致しないので RDR-105 が落ちる。
- 結論: 採るのは `body`。順序を本文の印から取るなら、RDR-105 は集合の一致で足りる。`body` では RDR-102〜104 の判定はすべて印から出るので、RDR-105 は検査の正しさのためではなく、frontmatter（LSP 補完・`manuscript_binding`・ホバーが読む）を本文と揃えておくためにある。

## 道具

TLA+ と TLC。問いは「frontmatter と本文がどう食い違えば検査がだまされるか」で、食い違い方を全部並べて調べる必要がある。小さな有限の範囲を尽くす模型検査がいちばん安い。結果はすべて pstack の `/statechart` スキルで読む。コマンドと置き場所はそのスキルの版に従い、ここには写さない。

## 走らせ方

1. `/statechart` の手順どおり、リポジトリ外の作業フォルダに `statechart/` の中身を写す。
2. 採用案 `ReaderMarkerBody.cfg` で走らせる。期待は `Sound`、`NoFalseAlarm`、NoDeadlock が成立、342,732 状態。所要は数秒。状態数が 500 を超えるので図は出ない。
3. 検査が落ちうることを確かめるため、`ReaderMarkerSet.cfg` で走らせる。期待は `Sound` が 2 手（ch-01 を読む → ch-02 を読む）で破れ、報告の最後の状態が「検査は合格だが読者は不合格」になること。`/statechart` は最初に破れた規則を外して走り直すが、10 万状態で打ち切るので、`NoFalseAlarm` は「Rules not checked」に出る。両方を見たいときは、不変条件を 1 つだけにした cfg を作業フォルダで作る。
4. 反例の中身（`fm` / `body` / `pol`）は出力フォルダの `tlc.out` の `State 1` にある。図のラベルは章と判定しか出さないので、原稿の中身はここで読む。

## 落ちたとき: 設計の欠陥か、モデルの都合か

1. `tlc.out` の `fm`（frontmatter の列）と `body`（本文の印の列）を、上の「検査で分かったこと」の反例と見比べる。
2. `Sound` が破れた → 検査が読者の順序以外のもの（frontmatter の列）から判定を出している。直すのは設計か実装で、規則を弱めない。
3. `NoFalseAlarm` が破れた → 検査が、読者に関係の無い違い（申告の順、印の重複）で落としている。
4. 反例が実装で起きるかは、`internal/service/testdata/` に同じ frontmatter と本文を持つ原稿を作り、`go test ./internal/service/ -run ReaderPrereq` で確かめる。起きなければ、まずモデルが実装を写せていないと疑う。

## 落ちる検証を見た記録（2026-11-07）

まずモデル側を壊した。

| 壊し方 | 破れた規則 | 反例 |
|---|---|---|
| `Compare = "set"`（順序を frontmatter から取る） | `Sound`、`NoFalseAlarm` | 上の表のとおり |
| `body` のまま、最後の態度だけ frontmatter の列から取る（`lc == Last(fm[c], lastC)`。`Run` の `last` を frontmatter のループのまま残した場合に当たる） | `Sound`（2 手）、`NoFalseAlarm` | ch-01 本文 misled、ch-02 frontmatter `[shown, corrected]`・本文 corrected → shown。最後の態度が、検査では corrected、読者では shown |

壊しを戻した `body` は両規則が成立した。

実装でも同じ壊し方を確かめた。`Run` の印のループを `for _, raw := range fm.ReaderShows` に戻すと（`set` 方式に当たる）、`go test ./internal/service/` で `TestReaderPrereq_BodyOrderCatchesFrontmatterLie` と `TestReaderPrereq_LastStanceComesFromBody` が落ちる。戻すと通る。前者がモデルの `set` の反例、後者が上の表の 2 行目の反例を、原稿にしたものである。

## カバレッジと同期コミット

- 対象（設計）: 方法 1 の印の書式 `<!-- shows: 命題ID:態度 -->`、RDR-105 の意味（frontmatter の `reader_shows` と本文の印の集合が一致する）、章内順序と最後の態度の出所（本文の印の出現順）。原典は `docs/clarity.md` の「決めたこと（2026-11-07）」。
- 対象（コード、実装済み）: `internal/service/reader_prereq.go` の `ReaderPrereqService.Run` と、印を取り出す `internal/meta/markers.go` の `ShowMarkers`。モデルの `ReadChapter` は `for _, f := range files` の 1 周に当たる。`Src(c)` は `for _, raw := range markers` が回す列（本文の印）。RDR-105 は同じループの後で集合比較する。`lastC` は `last[d.PropositionID]`、`seenC` は `seenBefore`。本文は `internal/meta/frontmatter.go` の `Parse` が返す `Document.Body` から取る。
- モデルの範囲: 命題 1 つ（loc）、態度 3 つ（shown / misled / corrected）、2 章、各章の frontmatter と本文の印はそれぞれ長さ 2 まで、`reader_requires` は ch-02 の `{}` か `{loc:shown}`、方針は must-correct-if-false か may-remain-misled。この範囲のすべての組み合わせを調べた。
- 同期コミット: `8af14d0`（2026-11-07）。このコミットの `Run` で、`Src` が印のループ、`lastC` が `last`、`seenC` が `seenBefore` に当たることを読んで確かめた。印のループを frontmatter に戻す壊しで 2 つのテストが落ちることも確かめた（「落ちる検証を見た記録」）。
- 対象のファイルが同期コミットより後に変わったら、検査を走らせ、`/maintain-formal-verification-skill` で上の対応を読み直してから、この行の同期コミットを進める。検査が通っただけでは進めない。

## 範囲外

- 命題どうしの関係。命題ごとの判定は独立なので、1 つで代表させた。
- 3 章以上、長さ 3 以上の列。順序の食い違いは 2 章・長さ 2 で最短の反例が出るので、そこまでにした。
- `reader_requires` を本文の印で置く形（段落の単位で前提を置く）。要求は今の設計どおり章の先頭で評価する。
- `withheld`、`inferring`、`convinced`、態度 null の要求。いずれも RDR-102 の集合判定にしか効かず、その判定は `verify-reader-prereq` が見ている。
- 印の文字列の解析（書式の誤り、コードブロック内の印）。それは実装の単体テストで見る。
- 本文が命題の意味を本当に伝えているか。検査が保証するのは「印を置いた場所が本文にある」ことまで。

## ファイル

- `statechart/ReaderMarker.tla` モデル。
- `statechart/ReaderMarkerBody.cfg` 採用案。`ReaderMarkerSet.cfg`、`ReaderMarkerSequence.cfg` は比較用で、落ちるのが正しい。
- `statechart/view.mjs` 状態と遷移の日本語ラベル。
