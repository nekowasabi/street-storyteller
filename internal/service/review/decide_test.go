package review_test

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R5: the judge rules. Thresholds come from Profile (0.6 whole, 0.5 item).

type judged struct {
	spec    review.Spec
	answers review.Answers
	values  review.Values
}

// oneAgent builds a one-agent spec whose cells are door (1 must) and loc (2
// musts), with the golden answers, and every value set to v.
func oneAgent(t *testing.T, v float64) judged {
	t.Helper()
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	spec.Agents = []review.Agent{{Agent: "P1", Runtime: "codex"}}
	j := judged{spec: spec, answers: review.Answers{}, values: review.Values{}}
	for _, cell := range g.Judge {
		j.answers[review.Cell{Agent: "P1", Fact: cell.Fact, Ref: review.Ref(cell.Ref)}] = cell.Answer
	}
	for _, q := range review.JudgeQueries(spec, j.answers) {
		j.values[q.Key(spec.Profile.JudgeModel)] = v
	}
	return j
}

func (j judged) set(t *testing.T, fact string, ref review.Ref, whole float64, items ...float64) {
	t.Helper()
	var f review.FactAsk
	for _, x := range j.spec.Asks {
		if x.ID == fact {
			f = x
		}
	}
	qs := review.AnswerQueries(j.spec, f, ref, j.answers[review.Cell{Agent: "P1", Fact: fact, Ref: ref}])
	j.values[qs[0].Key(j.spec.Profile.JudgeModel)] = whole
	for i, it := range items {
		j.values[qs[i+1].Key(j.spec.Profile.JudgeModel)] = it
	}
}

func (j judged) decide(resolved ...review.Resolution) review.Matrix {
	return review.Decide(j.spec, j.answers, j.values, resolved)
}

func status(m review.Matrix, fact string, ref review.Ref) string {
	for _, c := range m.Cells {
		if c.Cell.Fact == fact && c.Cell.Ref == ref {
			return c.Status
		}
	}
	return "<absent>"
}

func TestDecide_AllStatedIsPass(t *testing.T) {
	m := oneAgent(t, 0.9).decide()
	if m.Verdict != review.Pass || m.Tally.Declared != 4 || m.Tally.Stated != 4 || len(m.Holds) != 0 {
		t.Errorf("matrix = %+v", m)
	}
}

func TestDecide_ThresholdsAreInclusive(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.set(t, "loc", review.AskRef, 0.6, 0.5, 0.5)
	if m := j.decide(); status(m, "loc", review.AskRef) != "stated" || m.Verdict != review.Pass {
		t.Errorf("whole 0.6 / items 0.5 should be stated: %+v", m)
	}
	j.set(t, "loc", review.AskRef, 0.59, 0.9, 0.9)
	if m := j.decide(); status(m, "loc", review.AskRef) != "hold" || m.Verdict != review.Author {
		t.Errorf("whole 0.59 should hold → author: %+v", m)
	}
	j.set(t, "loc", review.AskRef, 0.9, 0.9, 0.49)
	if m := j.decide(); status(m, "loc", review.AskRef) != "hold" || m.Verdict != review.Author {
		t.Errorf("min item 0.49 should hold → author: %+v", m)
	}
}

func TestDecide_HoldCarriesQuestionAnswerKeyAndValues(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.set(t, "loc", review.ReaskRef, 0.9, 0.9, 0.49)
	m := j.decide()
	if len(m.Holds) != 1 {
		t.Fatalf("holds = %+v", m.Holds)
	}
	h := m.Holds[0]
	if h.Cell != (review.Cell{Agent: "P1", Fact: "loc", Ref: review.ReaskRef}) {
		t.Errorf("cell = %+v", h.Cell)
	}
	if !strings.HasPrefix(h.Question, "（2章を読み終えた時点で）") || h.Answer == "" || len(h.Key.Must) != 2 {
		t.Errorf("hold = %+v", h)
	}
	if h.Whole != 0.9 || len(h.Items) != 2 || h.Items[1] != 0.49 {
		t.Errorf("values = whole %v items %v", h.Whole, h.Items)
	}
	if m.Tally.Hold != 1 || m.Tally.Stated != 3 {
		t.Errorf("tally = %+v", m.Tally)
	}
}

func TestDecide_UnknownAnswerBelowThresholdIsUnknownAndEdit(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.answers[review.Cell{Agent: "P1", Fact: "door", Ref: review.AskRef}] = " 不明。まだ読めていない"
	j.set(t, "door", review.AskRef, 0.1, 0.1)
	m := j.decide()
	if status(m, "door", review.AskRef) != "unknown" || m.Verdict != review.Edit || m.Tally.Unknown != 1 {
		t.Errorf("matrix = %+v", m)
	}
	// A hold beside an unknown still yields edit: the reader must fix the body first.
	j.set(t, "loc", review.AskRef, 0.1, 0.9, 0.9)
	if m := j.decide(); m.Verdict != review.Edit {
		t.Errorf("unknown + hold = %s, want edit", m.Verdict)
	}
}

func TestDecide_UnknownAnswerAboveThresholdIsStated(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.answers[review.Cell{Agent: "P1", Fact: "door", Ref: review.AskRef}] = "不明だが裏口は夜通し開いていると女将が言った"
	j.set(t, "door", review.AskRef, 0.9, 0.9)
	if m := j.decide(); status(m, "door", review.AskRef) != "stated" {
		t.Errorf("status = %s, want stated (threshold wins over 不明)", status(m, "door", review.AskRef))
	}
}

func TestDecide_MissingValueIsErrorAndCellHolds(t *testing.T) {
	j := oneAgent(t, 0.9)
	qs := review.AnswerQueries(j.spec, j.spec.Asks[1], review.AskRef, j.answers[review.Cell{Agent: "P1", Fact: "loc", Ref: review.AskRef}])
	delete(j.values, qs[2].Key(j.spec.Profile.JudgeModel))
	m := j.decide()
	if m.Verdict != review.Error {
		t.Errorf("verdict = %s, want error (REV-401)", m.Verdict)
	}
	if s := status(m, "loc", review.AskRef); s != "hold" {
		t.Errorf("cell with a missing value = %s, want hold", s)
	}
}

func TestDecide_MissingAnswerIsError(t *testing.T) {
	j := oneAgent(t, 0.9)
	delete(j.answers, review.Cell{Agent: "P1", Fact: "door", Ref: review.ReaskRef})
	m := j.decide()
	if m.Verdict != review.Error || m.Tally.Missing != 1 {
		t.Errorf("matrix = %+v", m)
	}
}

func resolution(j judged, fact string, ref review.Ref, decision string) review.Resolution {
	var f review.FactAsk
	for _, x := range j.spec.Asks {
		if x.ID == fact {
			f = x
		}
	}
	answer := j.answers[review.Cell{Agent: "P1", Fact: fact, Ref: ref}]
	return review.Resolution{Agent: "P1", Fact: fact, Ref: ref, AnswerSHA: review.AnswerSHA(answer), KeySHA: review.KeySHA(f.Ask.Question, f.Ask.Answer), Decision: decision, Reason: "author"}
}

func TestResolved_AcceptMakesHoldStated(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.set(t, "loc", review.ReaskRef, 0.1, 0.1, 0.1)
	m := j.decide(resolution(j, "loc", review.ReaskRef, "accept"))
	if m.Verdict != review.Pass || status(m, "loc", review.ReaskRef) != "stated" || m.Tally.Resolved != 1 {
		t.Errorf("matrix = %+v", m)
	}
}

func TestResolved_RejectMakesCellUnknownAndEdit(t *testing.T) {
	j := oneAgent(t, 0.9)
	m := j.decide(resolution(j, "loc", review.ReaskRef, "reject"))
	if m.Verdict != review.Edit || status(m, "loc", review.ReaskRef) != "unknown" {
		t.Errorf("matrix = %+v", m)
	}
}

func TestResolved_IgnoredWhenAnswerChanged(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.set(t, "loc", review.ReaskRef, 0.1, 0.1, 0.1)
	r := resolution(j, "loc", review.ReaskRef, "accept")
	j.answers[review.Cell{Agent: "P1", Fact: "loc", Ref: review.ReaskRef}] += "。"
	j.set(t, "loc", review.ReaskRef, 0.1, 0.1, 0.1)
	m := j.decide(r)
	if m.Verdict != review.Author || status(m, "loc", review.ReaskRef) != "hold" || m.Tally.Resolved != 0 {
		t.Errorf("stale resolution applied: %+v", m)
	}
}

func TestResolved_IgnoredWhenKeyChanged(t *testing.T) {
	j := oneAgent(t, 0.9)
	j.set(t, "loc", review.ReaskRef, 0.1, 0.1, 0.1)
	r := resolution(j, "loc", review.ReaskRef, "accept")
	j.spec.Asks[1].Ask.Answer.Extra = "広げた補足"
	for _, q := range review.JudgeQueries(j.spec, j.answers) {
		j.values[q.Key(j.spec.Profile.JudgeModel)] = 0.9
	}
	j.set(t, "loc", review.ReaskRef, 0.1, 0.1, 0.1)
	m := j.decide(r)
	if m.Verdict != review.Author || m.Tally.Resolved != 0 {
		t.Errorf("resolution survived a key change: %+v", m)
	}
}

func TestResolved_ReadsTSVAndSkipsCommentsAndHeader(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "resolved.tsv")
	writeFile(t, path, "# 著者が解いた記録\nagent\tfact\tref\tanswer_sha\tkey_sha\tdecision\treason\n\nP2\tloc\treask\tabcdef012345\t0123456789ab\taccept\t内容は合っている\n")
	got, err := review.ReadResolutions(path)
	if err != nil {
		t.Fatal(err)
	}
	want := review.Resolution{Agent: "P2", Fact: "loc", Ref: review.ReaskRef, AnswerSHA: "abcdef012345", KeySHA: "0123456789ab", Decision: "accept", Reason: "内容は合っている"}
	if len(got) != 1 || got[0] != want {
		t.Errorf("got %+v, want %+v", got, want)
	}
	if got, err := review.ReadResolutions(filepath.Join(dir, "absent.tsv")); err != nil || len(got) != 0 {
		t.Errorf("absent file: %v %+v", err, got)
	}
}

func TestResolved_HashesAreTwelveHexDigits(t *testing.T) {
	a := review.AnswerSHA("答え")
	k := review.KeySHA("q", review.Key{Must: []string{"a"}})
	for _, h := range []string{a, k} {
		if len(h) != 12 || strings.Trim(h, "0123456789abcdef") != "" {
			t.Errorf("hash %q is not 12 hex digits", h)
		}
	}
	if review.KeySHA("q", review.Key{Must: []string{"a"}}) == review.KeySHA("q", review.Key{Must: []string{"a"}, Extra: "e"}) {
		t.Error("extra does not change the key hash")
	}
}
