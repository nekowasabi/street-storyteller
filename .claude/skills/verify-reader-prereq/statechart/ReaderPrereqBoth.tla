---- MODULE ReaderPrereqBoth ----
EXTENDS Naturals, FiniteSets, Sequences

(* ReaderPrereq.tla と同じ設計データと規則。本編と別案（回想順）を 1 つのモデルで分岐させ、
   どの経路で規則が落ちるかを 1 枚の図にする。 *)

Props == {"loc", "hist", "coat"}

Policy == [p \in Props |->
  CASE p = "loc"  -> "must-correct-if-false"
    [] p = "hist" -> "may-remain-withheld"
    [] p = "coat" -> "may-remain-misled"]

Obs(p, s) == [p |-> p, s |-> s]

Shows == [c \in 1..4 |->
  CASE c = 2 -> <<Obs("loc", "shown"), Obs("loc", "inferring"), Obs("hist", "withheld")>>
    [] c = 3 -> <<Obs("loc", "convinced"), Obs("coat", "misled")>>
    [] c = 4 -> <<Obs("loc", "misled"), Obs("loc", "corrected")>>
    [] OTHER -> <<>>]

Requires == [c \in 1..4 |->
  CASE c = 3 -> {Obs("loc", "shown"), Obs("hist", "any")}
    [] c = 4 -> {Obs("loc", "convinced")}
    [] OTHER -> {}]

Orders == [main |-> <<1, 2, 3, 4>>, flashback |-> <<1, 3, 2, 4>>]

Range(seq) == {seq[i] : i \in 1..Len(seq)}

VARIABLES order, pos, chapter, seen, before, cur
vars == <<order, pos, chapter, seen, before, cur>>

Init ==
  /\ order \in {"main", "flashback"}
  /\ pos = 0 /\ chapter = 0
  /\ seen = {} /\ before = {}
  /\ cur = [p \in Props |-> "unshown"]

LastStance(c, p) ==
  LET idx == {i \in 1..Len(Shows[c]) : Shows[c][i].p = p}
  IN IF idx = {} THEN cur[p] ELSE Shows[c][CHOOSE i \in idx : \A j \in idx : j <= i].s

Read(c) ==
  /\ pos' = pos + 1
  /\ chapter' = c
  /\ before' = seen
  /\ seen' = seen \cup Range(Shows[c])
  /\ cur' = [p \in Props |-> LastStance(c, p)]
  /\ UNCHANGED order

ReadInOrder == pos < 4 /\ order = "main" /\ Read(Orders.main[pos + 1])
ReadFlashback == pos < 4 /\ order = "flashback" /\ Read(Orders.flashback[pos + 1])
Done == pos = 4 /\ UNCHANGED vars

Next == ReadInOrder \/ ReadFlashback \/ Done
Spec == Init /\ [][Next]_vars

Satisfied(r, prior) == \E o \in prior : o.p = r.p /\ (r.s = "any" \/ o.s = r.s)
MisledEarlierInChapter(c, i) ==
  \E j \in 1..(i - 1) : Shows[c][j].p = Shows[c][i].p /\ Shows[c][j].s = "misled"

PrereqBeforeUse == pos = 0 \/ \A r \in Requires[chapter] : Satisfied(r, before)
CorrectedAfterMisled == pos = 0 \/
  \A i \in 1..Len(Shows[chapter]) : Shows[chapter][i].s = "corrected" =>
    Obs(Shows[chapter][i].p, "misled") \in before \/ MisledEarlierInChapter(chapter, i)
MustCorrectAtEnd == pos = 4 => \A p \in Props :
  Policy[p] = "must-correct-if-false" => cur[p] = "corrected"
====
