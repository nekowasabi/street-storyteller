package service_test

import (
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service"
)

func runReaderCheck(t *testing.T, tsv, main string) service.ReaderCheckResult {
	t.Helper()
	dir := localTestdata(t, "clarity_rainkey")
	if main != "" {
		main = filepath.Join(dir, main)
	}
	res, err := service.NewReaderCheckService().Run(filepath.Join(dir, "manuscripts"), filepath.Join(dir, tsv), main)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	return res
}

func cell(t *testing.T, res service.ReaderCheckResult, persona, fact string, chapter int) service.MatrixCell {
	t.Helper()
	for _, row := range res.Matrix {
		if row.Persona == persona && row.Fact == fact {
			return row.Cells[chapter-1]
		}
	}
	t.Fatalf("no matrix row %s/%s", persona, fact)
	return service.MatrixCell{}
}

func TestReaderCheck_PassHasNoFindingsAndFillsEveryBox(t *testing.T) {
	res := runReaderCheck(t, "observations_pass.tsv", "")
	if len(res.Findings) != 0 || !res.OK {
		t.Fatalf("want no findings, got %v", res.Findings)
	}
	if res.ChaptersChecked != 4 || res.Observations != 9 {
		t.Errorf("chapters=%d observations=%d", res.ChaptersChecked, res.Observations)
	}
	got := map[string]int{}
	for _, s := range res.Stumbles {
		got[s.Box]++
	}
	for _, b := range service.Boxes {
		if got[b] == 0 {
			t.Errorf("box %s is empty: %v", b, res.Stumbles)
		}
	}
	for _, s := range res.Stumbles {
		if s.Box == service.BoxEarly && s.Cause != "chapter02.md" {
			t.Errorf("早すぎ cause = %q, want the chapter that first declares loc", s.Cause)
		}
	}
}

func TestReaderCheck_ClaimCarriesToLaterChapters(t *testing.T) {
	res := runReaderCheck(t, "observations_pass.tsv", "")
	if c := cell(t, res, "P1", "loc", 4); c.Expected != "corrected" || c.Observed != service.ObservedStated {
		t.Errorf("ch4 loc = %+v, want corrected/stated carried from ch3", c)
	}
	if c := cell(t, res, "P1", "coat", 4); c.Observed != service.ObservedWrong {
		t.Errorf("ch4 coat = %+v, want wrong carried from ch3", c)
	}
	if c := cell(t, res, "P1", "loc", 1); c.Expected != "-" || c.Observed != service.ObservedAbsent {
		t.Errorf("ch1 loc = %+v, want -/absent before any claim", c)
	}
}

func TestReaderCheck_DroppedReturnsToAbsent(t *testing.T) {
	res := runReaderCheck(t, "observations_break_201.tsv", "")
	if c := cell(t, res, "P1", "loc", 3); c.Observed != service.ObservedStated {
		t.Errorf("ch3 loc = %+v, want stated", c)
	}
	if c := cell(t, res, "P1", "loc", 4); c.Observed != service.ObservedAbsent {
		t.Errorf("ch4 loc = %+v, want absent after dropped", c)
	}
}

func TestReaderCheck_BreakTable(t *testing.T) {
	cases := []struct {
		tsv  string
		want string
		ok   bool
	}{
		{"observations_break_201.tsv", "RDR-201@chapter04.md:12", false},
		{"observations_break_202.tsv", "RDR-202@chapter04.md:12", false},
		{"observations_break_203.tsv", "RDR-203@chapter03.md:13", false},
		{"observations_break_204.tsv", "RDR-204@chapter02.md:12", false},
		{"observations_break_205.tsv", "RDR-205@chapter04.md:12", true},
		{"observations_break_206.tsv", "RDR-206@chapter03.md:13", true},
	}
	for _, tc := range cases {
		t.Run(tc.tsv, func(t *testing.T) {
			res := runReaderCheck(t, tc.tsv, "")
			got := make([]string, len(res.Findings))
			for i, v := range res.Findings {
				got[i] = v.Code + "@" + filepath.Base(v.File) + ":" + strconv.Itoa(v.Line)
			}
			if strings.Join(got, " ") != tc.want {
				t.Errorf("findings = %v, want %s\n%v", got, tc.want, res.Findings)
			}
			if res.OK != tc.ok {
				t.Errorf("OK = %v, want %v", res.OK, tc.ok)
			}
		})
	}
}

func TestReaderCheck_MainFailsOnlyOnMainProposition(t *testing.T) {
	if res := runReaderCheck(t, "observations_break_202.tsv", "main.txt"); !res.MainFailed {
		t.Error("RDR-202 on loc, listed in main.txt, must fail")
	}
	if res := runReaderCheck(t, "observations_break_204.tsv", "main.txt"); res.MainFailed {
		t.Error("RDR-204 on hist, not in main.txt, must not fail")
	}
	if res := runReaderCheck(t, "observations_break_205.tsv", "main.txt"); res.MainFailed {
		t.Error("RDR-205 is informational and must not fail")
	}
}

func TestParseObservations_RejectsBadRows(t *testing.T) {
	for name, row := range map[string]string{
		"columns": "claim\tP1\t1\tr\tloc\tstated",
		"chapter": "claim\tP1\t9\tr\tloc\tstated\t\t\t",
		"state":   "claim\tP1\t1\tr\tloc\tsure\t\t\t",
		"kind":    "note\tP1\t1\tr\tloc\t-\t\t\t",
	} {
		if _, err := service.ParseObservations(strings.NewReader(row+"\n"), 4); err == nil {
			t.Errorf("%s: want an error for %q", name, row)
		}
	}
}

func TestReaderCheck_SameChapterClaimsPreferWrong(t *testing.T) {
	chapters, err := service.WalkStances(filepath.Join(localTestdata(t, "clarity_rainkey"), "manuscripts"))
	if err != nil {
		t.Fatal(err)
	}
	obs, err := service.ParseObservations(strings.NewReader(
		"claim\tP1\t3\ta\tloc\tinferred\t\t\t\nclaim\tP1\t3\tb\tloc\twrong\t\t\t\nclaim\tP1\t3\tc\tloc\tstated\t\t\t\n"), 4)
	if err != nil {
		t.Fatal(err)
	}
	res := service.CheckReader(chapters, obs, nil)
	if c := cell(t, res, "P1", "loc", 3); c.Observed != service.ObservedWrong {
		t.Errorf("ch3 loc = %+v, want wrong", c)
	}
}
