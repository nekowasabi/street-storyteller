---- MODULE ReaderMarker ----
EXTENDS Naturals, FiniteSets, Sequences

(* 方法 1: 原稿本文に <!-- shows: 命題ID:態度 --> の印を置き、frontmatter の reader_shows と
   突き合わせる（RDR-105）。読者が実際に受け取る順序は本文の印の順である。
   問い: frontmatter と印の比べ方・章内順序の出所をどう選べば、検査の合格が
   「本文の順で読んだ読者にも RDR-102〜104 が成り立つ」ことを保証するか。

   命題は 1 つ（loc）。2 章。各章の frontmatter の列と本文の印の列を長さ 2 まで全列挙する。
   1 手は internal/service/reader_prereq.go の Run の `for _, f := range files` の 1 周
   （原稿 1 ファイル）に対応する。 *)

\* "set":      RDR-105 は集合で比べ、章内順序は frontmatter の列（今の Run）で見る
\* "sequence": RDR-105 は列で比べる（順序も一致を求める）
\* "body":     RDR-105 は集合で比べ、章内順序と最後の態度は本文の印の列で見る
CONSTANT Compare

Stances == {"shown", "misled", "corrected"}
Seqs == {<<>>} \cup {<<a>> : a \in Stances} \cup {<<a, b>> : a \in Stances, b \in Stances}
Range(s) == {s[i] : i \in 1..Len(s)}
Last(s, dflt) == IF Len(s) = 0 THEN dflt ELSE s[Len(s)]

\* RDR-103: 列 s の各 corrected の前に、前の章か同じ列のより前に misled がある
OK103(s, prior) == \A i \in 1..Len(s) :
  s[i] = "corrected" => ("misled" \in prior \/ \E j \in 1..(i - 1) : s[j] = "misled")

VARIABLES fm, body, req2, pol,         \* 原稿と命題（初期状態で全列挙し、以後変えない）
          pos,                         \* 読み終えた章の数
          seenC, lastC, chkFail,       \* 検査器が見たもの・最後の態度・違反を出したか
          seenR, lastR, rdrFail        \* 本文の順で読んだ読者の真実
vars == <<fm, body, req2, pol, pos, seenC, lastC, chkFail, seenR, lastR, rdrFail>>

Init ==
  /\ fm \in [1..2 -> Seqs]             \* reader_shows（列の順）
  /\ body \in [1..2 -> Seqs]           \* 本文の印（出現順）
  /\ req2 \in {{}, {"shown"}}          \* ch-02 の reader_requires。ch-01 には前の章が無いので要求なし
  /\ pol \in {"must-correct-if-false", "may-remain-misled"}
  /\ pos = 0
  /\ seenC = {} /\ lastC = "unshown" /\ chkFail = FALSE
  /\ seenR = {} /\ lastR = "unshown" /\ rdrFail = FALSE

Src(c) == IF Compare = "body" THEN body[c] ELSE fm[c]
Match(c) == IF Compare = "sequence" THEN fm[c] = body[c] ELSE Range(fm[c]) = Range(body[c])
Req(c) == IF c = 2 THEN req2 ELSE {}
\* RDR-104 は最後の章を読み終えた時点で見る
EndBad(c, last) == c = 2 /\ pol = "must-correct-if-false" /\ last # "corrected"

ReadChapter ==
  /\ pos < 2
  /\ LET c  == pos + 1
         lc == Last(Src(c), lastC)
         lr == Last(body[c], lastR)
     IN /\ pos' = c
        /\ chkFail' = (chkFail \/ ~Match(c) \/ ~(Req(c) \subseteq seenC)
                         \/ ~OK103(Src(c), seenC) \/ EndBad(c, lc))
        /\ seenC' = seenC \cup Range(Src(c))
        /\ lastC' = lc
        /\ rdrFail' = (rdrFail \/ ~(Req(c) \subseteq seenR)
                         \/ ~OK103(body[c], seenR) \/ EndBad(c, lr))
        /\ seenR' = seenR \cup Range(body[c])
        /\ lastR' = lr
  /\ UNCHANGED <<fm, body, req2, pol>>

Done == pos = 2 /\ UNCHANGED vars

Next == ReadChapter \/ Done
Spec == Init /\ [][Next]_vars

(* 規則 *)
\* 検査が通った原稿は、本文の順で読んだ読者にも RDR-102〜104 を満たす（見逃しが無い）
Sound == (pos = 2 /\ ~chkFail) => ~rdrFail
\* 本文の順で問題が無く、frontmatter が印と同じものを申告しているなら、検査は落とさない（空振りが無い）
NoFalseAlarm == (pos = 2 /\ ~rdrFail /\ \A c \in 1..2 : Range(fm[c]) = Range(body[c])) => ~chkFail
====
