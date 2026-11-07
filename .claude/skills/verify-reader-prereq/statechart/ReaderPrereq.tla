---- MODULE ReaderPrereq ----
EXTENDS Naturals, FiniteSets, Sequences

(* 設計 docs/designs/reader-prereq-sketch.ts の manuscripts / propositions を写したもの。
   スケッチを変えたら、この Shows / Requires / Policy を手で合わせる。 *)

Props == {"loc", "hist", "coat"}

\* propositions[].resolutionPolicy
Policy == [p \in Props |->
  CASE p = "loc"  -> "must-correct-if-false"
    [] p = "hist" -> "may-remain-withheld"
    [] p = "coat" -> "may-remain-misled"]

Obs(p, s) == [p |-> p, s |-> s]

\* manuscripts[c].reader_shows（列の順）。c は章の番号
Shows == [c \in 1..4 |->
  CASE c = 2 -> <<Obs("loc", "shown"), Obs("loc", "inferring"), Obs("hist", "withheld")>>
    [] c = 3 -> <<Obs("loc", "convinced"), Obs("coat", "misled")>>
    [] c = 4 -> <<Obs("loc", "misled"), Obs("loc", "corrected")>>
    [] OTHER -> <<>>]

\* manuscripts[c].reader_requires。stance が null の要求は s = "any"
Requires == [c \in 1..4 |->
  CASE c = 3 -> {Obs("loc", "shown"), Obs("hist", "any")}
    [] c = 4 -> {Obs("loc", "convinced")}
    [] OTHER -> {}]

\* 提示順。main は章の順（ファイル名順）。flashback は ch-03 を ch-02 より前に置く別案。
CONSTANT Variant
Order == IF Variant = "flashback" THEN <<1, 3, 2, 4>> ELSE <<1, 2, 3, 4>>

Range(seq) == {seq[i] : i \in 1..Len(seq)}

VARIABLES pos, chapter, seen, before, cur
vars == <<pos, chapter, seen, before, cur>>

Init ==
  /\ pos = 0 /\ chapter = 0
  /\ seen = {} /\ before = {}
  /\ cur = [p \in Props |-> "unshown"]

LastStance(c, p) ==
  LET idx == {i \in 1..Len(Shows[c]) : Shows[c][i].p = p}
  IN IF idx = {} THEN cur[p] ELSE Shows[c][CHOOSE i \in idx : \A j \in idx : j <= i].s

ReadChapter ==
  /\ pos < 4
  /\ pos' = pos + 1
  /\ chapter' = Order[pos + 1]
  /\ before' = seen
  /\ seen' = seen \cup Range(Shows[Order[pos + 1]])
  /\ cur' = [p \in Props |-> LastStance(Order[pos + 1], p)]

Done == pos = 4 /\ UNCHANGED vars

Next == ReadChapter \/ Done
Spec == Init /\ [][Next]_vars

\* 要求 r を、より前の章の開示 prior が満たすか。s = "any" は態度を問わない
Satisfied(r, prior) == \E o \in prior : o.p = r.p /\ (r.s = "any" \/ o.s = r.s)

\* 章 c の列の中で、i 番目の corrected より前に同じ命題の misled があるか
MisledEarlierInChapter(c, i) ==
  \E j \in 1..(i - 1) : Shows[c][j].p = Shows[c][i].p /\ Shows[c][j].s = "misled"

(* 規則 *)
\* RDR-102 この章を読むのに要る前提は、より前の章で読者に渡っている
PrereqBeforeUse == pos = 0 \/ \A r \in Requires[chapter] : Satisfied(r, before)
\* RDR-103 訂正済みになるのは、同じ命題で読者が一度誤信したあとだけ。同じ章の中では列の順で見る
CorrectedAfterMisled == pos = 0 \/
  \A i \in 1..Len(Shows[chapter]) : Shows[chapter][i].s = "corrected" =>
    Obs(Shows[chapter][i].p, "misled") \in before \/ MisledEarlierInChapter(chapter, i)
\* RDR-104 偽と宣言した命題は、最後の章までに訂正される
MustCorrectAtEnd == pos = 4 => \A p \in Props :
  Policy[p] = "must-correct-if-false" => cur[p] = "corrected"
====
