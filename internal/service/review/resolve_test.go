package review_test

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R13: review resolve.

func (r *rig) resolve(cell string, accept bool, why string) review.Report {
	parts := strings.Split(cell, ":")
	return review.Resolve(context.Background(), review.ResolveRequest{Path: r.path, Cell: review.Cell{Agent: parts[0], Fact: parts[1], Ref: review.Ref(parts[2])}, Accept: accept, Reject: !accept, Why: why}, r.deps)
}

func TestResolve_AcceptAppendsRowChangesFingerprintAndMakesCellStated(t *testing.T) {
	r := newRig(t)
	keys := r.cellKeys("loc", review.ReaskRef, goldenAnswers(t)["loc（再）"])
	r.decider.values[keys[0]] = 0.3
	r.readEveryone(nil)
	hold := r.clarity(false)
	if hold.Verdict != review.Author || hold.Cells.Hold != 3 {
		t.Fatalf("precondition: %s cells=%+v", hold.Verdict, hold.Cells)
	}
	rep := r.resolve("P2:loc:reask", true, "内容は合っている")
	if rep.Verdict != review.Done || rep.ExitCode() != 0 {
		t.Fatalf("resolve = %s %s", rep.Verdict, rep.Error)
	}
	if rep.Criteria == hold.Criteria || rep.Criteria == "" {
		t.Errorf("criteria unchanged: %s", rep.Criteria)
	}
	tsv := readFile(t, filepath.Join(r.root, "src", "reviews", "resolved.tsv"))
	rows := strings.Split(strings.TrimSpace(tsv), "\n")
	if len(rows) != 1 {
		t.Fatalf("resolved.tsv = %q", tsv)
	}
	cols := strings.Split(rows[0], "\t")
	if len(cols) != 7 || cols[0] != "P2" || cols[1] != "loc" || cols[2] != "reask" || cols[5] != "accept" || cols[6] != "内容は合っている" {
		t.Errorf("row = %q", rows[0])
	}
	if len(cols[3]) != 12 || len(cols[4]) != 12 {
		t.Errorf("hash columns = %q %q, want 12 hex digits", cols[3], cols[4])
	}
	launches := len(r.launcher.Launches())
	after := r.clarity(false)
	// Why: The contract puts the effective author record in the run id, so the id changes. Readers must not reread, which is the launch count.
	if after.Run == hold.Run {
		t.Fatalf("run id stayed %s after an author record; criteria materials include that record", hold.Run)
	}
	if got := len(r.launcher.Launches()); got != launches {
		t.Fatalf("resolving relaunched readers (%d -> %d) on %s -> %s (%s %s)", launches, got, hold.Run, after.Run, after.Verdict, findingCodes(after))
	}
	if after.Cells == nil || after.Verdict != review.Author || after.Cells.Hold != 2 || after.Cells.Resolved != 1 || after.Cells.Stated != 10 {
		t.Errorf("after one resolve: %s cells=%+v", after.Verdict, after.Cells)
	}
	if after.Criteria != rep.Criteria {
		t.Errorf("criteria %s after resolve, resolve reported %s", after.Criteria, rep.Criteria)
	}
	r.resolve("P1:loc:reask", true, "同じ")
	r.resolve("P3:loc:reask", true, "同じ")
	if final := r.clarity(false); final.Verdict != review.Pass || final.Cells.Resolved != 3 {
		t.Errorf("after all three: %s cells=%+v", final.Verdict, final.Cells)
	}
}

func TestResolve_RejectMakesCellUnknown(t *testing.T) {
	r := newRig(t)
	r.readEveryone(nil)
	if rep := r.resolve("P1:door:ask", false, "答えが違う"); rep.Verdict != review.Done {
		t.Fatalf("resolve = %s %s", rep.Verdict, rep.Error)
	}
	after := r.clarity(false)
	if after.Verdict != review.Edit || !strings.Contains(findingCodes(after), "REV-202") || after.Cells.Unknown != 1 {
		t.Errorf("after reject: %s %s cells=%+v", after.Verdict, findingCodes(after), after.Cells)
	}
}

func TestResolve_CellNotInRecordsIsUsage(t *testing.T) {
	r := newRig(t)
	if rep := r.resolve("P2:loc:reask", true, "x"); rep.Verdict != review.Usage || rep.ExitCode() != 2 {
		t.Errorf("before any reading: %s exit=%d", rep.Verdict, rep.ExitCode())
	}
	r.readEveryone(nil)
	for _, cell := range []string{"P9:loc:reask", "P2:coat:ask", "P2:loc:later"} {
		if rep := r.resolve(cell, true, "x"); rep.Verdict != review.Usage || rep.ExitCode() != 2 {
			t.Errorf("%s: %s exit=%d", cell, rep.Verdict, rep.ExitCode())
		}
	}
	if exists(filepath.Join(r.root, "src", "reviews", "resolved.tsv")) {
		t.Error("resolved.tsv written for a rejected request")
	}
}

func TestResolve_RequiresOneDecisionAndWhy(t *testing.T) {
	r := newRig(t)
	r.readEveryone(nil)
	bad := []review.ResolveRequest{
		{Path: r.path, Cell: review.Cell{Agent: "P2", Fact: "loc", Ref: review.ReaskRef}, Accept: true, Reject: true, Why: "x"},
		{Path: r.path, Cell: review.Cell{Agent: "P2", Fact: "loc", Ref: review.ReaskRef}, Why: "x"},
		{Path: r.path, Cell: review.Cell{Agent: "P2", Fact: "loc", Ref: review.ReaskRef}, Accept: true},
		{Path: r.path, Cell: review.Cell{Agent: "P2", Fact: "loc", Ref: review.ReaskRef}, Accept: true, Why: "二行\n目"},
	}
	for i, req := range bad {
		if rep := review.Resolve(context.Background(), req, r.deps); rep.Verdict != review.Usage {
			t.Errorf("case %d: %s", i, rep.Verdict)
		}
	}
}

func TestResolve_StaleAfterAnswerChangesWithReread(t *testing.T) {
	r := newRig(t)
	keys := r.cellKeys("loc", review.ReaskRef, goldenAnswers(t)["loc（再）"])
	r.decider.values[keys[0]] = 0.3
	r.readEveryone(nil)
	if rep := r.resolve("P2:loc:reask", true, "合っている"); rep.Verdict != review.Done {
		t.Fatal(rep.Error)
	}
	// The body changes, the panel rereads and P2 answers differently: the record no longer applies.
	r.fileReplace("manuscripts/chapter04.md", "鍵は旅人の荷物にあった。", "鍵は旅人の荷物の底にあった。")
	r.readEveryone(map[string]string{"loc（再）": "店主が持っていると思っていた"})
	for _, k := range r.cellKeys("loc", review.ReaskRef, "店主が持っていると思っていた") {
		r.decider.values[k] = 0.3
	}
	after := r.clarity(false)
	if after.Verdict != review.Author || after.Cells.Resolved != 0 || after.Cells.Hold != 3 {
		t.Errorf("stale resolution applied: %s cells=%+v", after.Verdict, after.Cells)
	}
}
