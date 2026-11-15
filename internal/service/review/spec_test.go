package review_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/service/review"
)

// R4: Spec, cells, criteria, and the stop-condition defects (REV-301).

func fullSpec(t *testing.T, dir string) review.Spec {
	t.Helper()
	spec := goldenSpec(t, loadGolden(t))
	spec.Agents = rainkeyAgents()
	spec.Chapters = rainkeyChapters(t, dir)
	spec.Prompts = map[string]string{"clarity-readme.md": "# 読み方", "persona-P1.md": "役1"}
	return spec
}

func TestSpec_LoadRainkeyReadsAsksAndDeadlines(t *testing.T) {
	spec, text, err := review.LoadSpec(filepath.Join(rainkeyDir, "manuscripts"))
	if err != nil {
		t.Fatalf("LoadSpec: %v", err)
	}
	if len(text) != 4 {
		t.Errorf("text = %d chapters, want 4", len(text))
	}
	if len(spec.Agents) != 3 {
		t.Errorf("agents = %d, want 3", len(spec.Agents))
	}
	got := map[string]int{}
	for _, f := range spec.Asks {
		got[f.ID] = f.Deadline
	}
	if len(got) != 2 || got["door"] != 1 || got["loc"] != 2 {
		t.Errorf("deadlines = %v, want door 1, loc 2", got)
	}
	if spec.Profile != review.DefaultProfile() {
		t.Errorf("Profile = %+v", spec.Profile)
	}
}

func TestSpec_CellsAreAgentsTimesMainFactsTimesRefs(t *testing.T) {
	spec := fullSpec(t, rainkeyDir)
	spec.Asks = append(spec.Asks, review.FactAsk{ID: "side", Ask: domain.Ask{Main: false, Question: "q", Answer: domain.AnswerKey{Must: []string{"a"}}}, Deadline: 1})
	cells := spec.Cells()
	if len(cells) != 12 {
		t.Fatalf("cells = %d, want 3 agents × 2 main × 2 refs = 12", len(cells))
	}
	seen := map[review.Cell]bool{}
	for _, c := range cells {
		if c.Fact == "side" {
			t.Errorf("non-main fact in cells: %+v", c)
		}
		if seen[c] {
			t.Errorf("duplicate cell %+v", c)
		}
		seen[c] = true
	}
	for _, a := range []string{"P1", "P2", "P3"} {
		for _, f := range []string{"door", "loc"} {
			for _, r := range []review.Ref{review.AskRef, review.ReaskRef} {
				if !seen[review.Cell{Agent: a, Fact: f, Ref: r}] {
					t.Errorf("missing cell %s %s %s", a, f, r)
				}
			}
		}
	}
}

func TestSpec_QuestionAddsDeadlinePrefixOnlyForAtDeadlineReask(t *testing.T) {
	spec := goldenSpec(t, loadGolden(t))
	var door, loc review.FactAsk
	for _, f := range spec.Asks {
		switch f.ID {
		case "door":
			door = f
		case "loc":
			loc = f
		}
	}
	if q := spec.Question(door, review.ReaskRef); q != door.Ask.Question {
		t.Errorf("now reask = %q, want plain question", q)
	}
	if q := spec.Question(loc, review.ReaskRef); q != "（2章を読み終えた時点で）"+loc.Ask.Question {
		t.Errorf("at-deadline reask = %q", q)
	}
	if q := spec.Question(loc, review.AskRef); q != loc.Ask.Question {
		t.Errorf("ask = %q, want plain question", q)
	}
}

func TestCriteria_IsEightHexDigits(t *testing.T) {
	c := fullSpec(t, rainkeyDir).Criteria()
	if len(c) != 8 || strings.Trim(c, "0123456789abcdef") != "" {
		t.Errorf("criteria = %q, want 8 lowercase hex digits", c)
	}
}

func TestCriteria_ChangesWithAskStatementMarkersAgentsPromptsResolved(t *testing.T) {
	base := fullSpec(t, rainkeyDir).Criteria()
	cases := map[string]func(s *review.Spec){
		"ask question":     func(s *review.Spec) { s.Asks[0].Ask.Question += "？" },
		"ask must":         func(s *review.Spec) { s.Asks[0].Ask.Answer.Must = append(s.Asks[0].Ask.Answer.Must, "x") },
		"ask extra":        func(s *review.Spec) { s.Asks[0].Ask.Answer.Extra = "補足" },
		"ask reask":        func(s *review.Spec) { s.Asks[0].Ask.Reask = domain.ReaskAtDeadline },
		"ask main":         func(s *review.Spec) { s.Asks[1].Ask.Main = false },
		"statement":        func(s *review.Spec) { s.Asks[0].Statement += "。" },
		"authorTruth":      func(s *review.Spec) { v := true; s.Asks[0].AuthorTruth = &v },
		"resolutionPolicy": func(s *review.Spec) { s.Asks[0].ResolutionPolicy = domain.ResolutionMayRemainMisled },
		"agent model":      func(s *review.Spec) { s.Agents[0].Model = "other" },
		"agent runtime":    func(s *review.Spec) { s.Agents[0].Runtime = "codex" },
		"agent effort":     func(s *review.Spec) { s.Agents[0].Effort = "high" },
		"agent added":      func(s *review.Spec) { s.Agents = append(s.Agents, review.Agent{Agent: "P4", Runtime: "codex"}) },
		"prompt override":  func(s *review.Spec) { s.Prompts["persona-P1.md"] = "別の役" },
		"resolved": func(s *review.Spec) {
			s.Resolved = append(s.Resolved, review.Resolution{Agent: "P2", Fact: "loc", Ref: review.ReaskRef, AnswerSHA: "a", KeySHA: "k", Decision: "accept", Reason: "ok"})
		},
	}
	for name, mutate := range cases {
		s := fullSpec(t, rainkeyDir)
		mutate(&s)
		if got := s.Criteria(); got == base {
			t.Errorf("%s: criteria unchanged (%s)", name, got)
		}
	}
}

func TestCriteria_ChangesWhenMarkerMovesOrRequiresChanges(t *testing.T) {
	base := fullSpec(t, rainkeyDir).Criteria()

	moved := copyRainkey(t)
	ch2 := filepath.Join(moved, "manuscripts", "chapter02.md")
	writeFile(t, ch2, strings.Replace(readFile(t, ch2), "<!-- shows: loc:shown -->\n", "", 1))
	if got := fullSpec(t, moved).Criteria(); got == base {
		t.Errorf("dropping a shown marker left criteria unchanged (%s)", got)
	}

	requires := copyRainkey(t)
	ch3 := filepath.Join(requires, "manuscripts", "chapter03.md")
	writeFile(t, ch3, strings.Replace(readFile(t, ch3), `    - "hist"`+"\n", "", 1))
	if got := fullSpec(t, requires).Criteria(); got == base {
		t.Errorf("dropping a reader_requires entry left criteria unchanged (%s)", got)
	}
}

func TestCriteria_IgnoresBodyTextAndStallMinutes(t *testing.T) {
	base := fullSpec(t, rainkeyDir).Criteria()

	edited := copyRainkey(t)
	ch1 := filepath.Join(edited, "manuscripts", "chapter01.md")
	writeFile(t, ch1, readFile(t, ch1)+"雨が強くなった。\n")
	if got := fullSpec(t, edited).Criteria(); got != base {
		t.Errorf("body text changed criteria: %s -> %s", base, got)
	}

	// stallMinutes, the judge string and the ateam path live in the manifest,
	// not in Spec; the manifest must not reach Criteria through LoadSpec.
	cfg := copyRainkey(t)
	manifest := filepath.Join(cfg, ".storyteller.json")
	writeFile(t, manifest, strings.NewReplacer(`"stallMinutes": 60`, `"stallMinutes": 5`, `"ateam.sh"`, `"/opt/ateam.sh"`).Replace(readFile(t, manifest)))
	spec, _, err := review.LoadSpec(filepath.Join(cfg, "manuscripts"))
	if err != nil {
		t.Fatalf("LoadSpec: %v", err)
	}
	ref, _, err := review.LoadSpec(filepath.Join(rainkeyDir, "manuscripts"))
	if err != nil {
		t.Fatal(err)
	}
	if spec.Criteria() != ref.Criteria() {
		t.Errorf("stallMinutes/ateam path changed criteria: %s -> %s", ref.Criteria(), spec.Criteria())
	}
}

func TestDefects_MainAskNeedsMarkerQuestionMustAndReask(t *testing.T) {
	if d := fullSpec(t, rainkeyDir).Defects(); len(d) != 0 {
		t.Fatalf("sample has defects: %+v", d)
	}
	cases := map[string]func(s *review.Spec){
		"no shown marker": func(s *review.Spec) { s.Asks[0].Deadline = 0 },
		"no question":     func(s *review.Spec) { s.Asks[0].Ask.Question = " " },
		"no must":         func(s *review.Spec) { s.Asks[0].Ask.Answer.Must = nil },
		"no reask":        func(s *review.Spec) { s.Asks[0].Ask.Reask = "" },
	}
	for name, mutate := range cases {
		s := fullSpec(t, rainkeyDir)
		mutate(&s)
		d := s.Defects()
		if len(d) != 1 || d[0].Code != "REV-301" || !d[0].Blocking || d[0].Fact != s.Asks[0].ID {
			t.Errorf("%s: defects = %+v, want one blocking REV-301 for %s", name, d, s.Asks[0].ID)
		}
	}
}

func TestDefects_NonMainAskIsNotChecked(t *testing.T) {
	s := fullSpec(t, rainkeyDir)
	s.Asks = append(s.Asks, review.FactAsk{ID: "side", Ask: domain.Ask{Main: false, Question: "q", Answer: domain.AnswerKey{Must: []string{"a"}}}})
	if d := s.Defects(); len(d) != 0 {
		t.Errorf("non-main ask without marker/reask reported: %+v", d)
	}
}

func TestBodyOf_StripsFrontmatterAndCommentsLikePrayground(t *testing.T) {
	src := readFile(t, filepath.Join(rainkeyDir, "manuscripts", "chapter02.md"))
	if got := review.BodyOf(src); got != "鍵が無いと騒ぎになる。" {
		t.Errorf("BodyOf = %q", got)
	}
	multi := "---\na: 1\n---\n<!-- one\ntwo -->\n  本文  \n"
	if got := review.BodyOf(multi); got != "本文" {
		t.Errorf("BodyOf(multiline comment) = %q", got)
	}
}

func TestReaderCopy_BlanksFrontmatterAndMarkersKeepingLines(t *testing.T) {
	src := readFile(t, filepath.Join(rainkeyDir, "manuscripts", "chapter02.md"))
	got := review.ReaderCopy(src)
	if strings.Contains(got, "shows:") || strings.Contains(got, "---") || strings.Contains(got, "reader_shows") {
		t.Errorf("copy still has frontmatter or markers:\n%s", got)
	}
	if strings.Count(got, "\n") != strings.Count(src, "\n") {
		t.Errorf("line count %d, want %d", strings.Count(got, "\n"), strings.Count(src, "\n"))
	}
	srcLines, gotLines := strings.Split(src, "\n"), strings.Split(got, "\n")
	for i := range srcLines {
		if strings.Contains(srcLines[i], "騒ぎ") && gotLines[i] != srcLines[i] {
			t.Errorf("body line %d moved or changed: %q", i+1, gotLines[i])
		}
	}
	for _, c := range rainkeyChapters(t, rainkeyDir) {
		b, _ := os.ReadFile(c.File)
		if strings.Count(review.ReaderCopy(string(b)), "\n") != strings.Count(string(b), "\n") {
			t.Errorf("%s: line count changed", c.File)
		}
	}
}
