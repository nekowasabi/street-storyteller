package review_test

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R19-R23: questions that share a state go out in one request. Values, keys
// and reports stay what they were when every question had its own request.

// goldenCell returns the judge queries of one golden cell and their keys.
func goldenCell(t *testing.T, i int) ([]review.Query, []string, string) {
	t.Helper()
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	cell := g.Judge[i]
	var fact review.FactAsk
	for _, f := range spec.Asks {
		if f.ID == cell.Fact {
			fact = f
		}
	}
	qs := review.AnswerQueries(spec, fact, review.Ref(cell.Ref), cell.Answer)
	var keys []string
	for _, q := range cell.Queries {
		keys = append(keys, q.Key)
	}
	if len(qs) != len(keys) {
		t.Fatalf("cell %d: %d queries, %d golden keys", i, len(qs), len(keys))
	}
	return qs, keys, g.Model
}

func cacheLines(t *testing.T, path string) map[string]float64 {
	t.Helper()
	out := map[string]float64{}
	if !exists(path) {
		return out
	}
	for _, line := range strings.Split(strings.TrimSpace(readFile(t, path)), "\n") {
		if line == "" {
			continue
		}
		var e struct {
			Key   string  `json:"key"`
			Value float64 `json:"value"`
		}
		if err := json.Unmarshal([]byte(line), &e); err != nil {
			t.Fatal(err)
		}
		out[e.Key] = e.Value
	}
	return out
}

func TestBundle_CellGoesInOneRequestWithQNames(t *testing.T) {
	qs, keys, model := goldenCell(t, 2)
	if len(qs) != 3 {
		t.Fatalf("loc/ask has %d queries, want 3", len(qs))
	}
	d := newFakeDecider()
	for i, k := range keys {
		d.values[k] = 0.7 + float64(i)/10
	}
	c := review.NewCache(filepath.Join(t.TempDir(), "judge-cache.jsonl"), d)
	c.Plan(qs)
	for i, q := range qs {
		v, err := c.Decide(context.Background(), model, q)
		if err != nil || v != 0.7+float64(i)/10 {
			t.Errorf("query %d = %v, %v", i, v, err)
		}
	}
	if d.Requests() != 1 || len(d.requests[0]) != 3 {
		t.Fatalf("requests = %d (first has %d questions), want 1 request of 3", d.Requests(), len(d.requests[0]))
	}
	var body struct {
		Model     string `json:"model"`
		State     string `json:"state"`
		Questions map[string]struct {
			Type, Instructions string
		} `json:"questions"`
	}
	raw, _ := json.Marshal(review.BundleRequest(model, d.requests[0]))
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	if body.Model != model || body.State != qs[0].State || len(body.Questions) != 3 {
		t.Fatalf("body = %s", raw)
	}
	for i, q := range qs {
		got := body.Questions[review.QuestionName(i)]
		if got.Type != "noul" || got.Instructions != q.Instructions {
			t.Errorf("q%d = %+v, want the instructions of query %d", i, got, i)
		}
	}
}

func TestBundleKey_CacheLinesUseGoldenKeys(t *testing.T) {
	qs, keys, model := goldenCell(t, 2)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	d := newFakeDecider()
	c := review.NewCache(path, d)
	c.Plan(qs)
	if _, err := c.Decide(context.Background(), model, qs[0]); err != nil {
		t.Fatal(err)
	}
	lines := cacheLines(t, path)
	if len(lines) != 3 {
		t.Fatalf("cache lines = %d, want 3", len(lines))
	}
	for _, k := range keys {
		if _, ok := lines[k]; !ok {
			t.Errorf("golden key %s not in the cache", k)
		}
	}

	// A cache filled one question at a time serves the bundled path whole.
	d2 := newFakeDecider()
	c2 := review.NewCache(path, d2)
	c2.Plan(qs)
	for _, q := range qs {
		if _, err := c2.Decide(context.Background(), model, q); err != nil {
			t.Fatal(err)
		}
	}
	if d2.Requests() != 0 || c2.Hits != 3 {
		t.Errorf("requests=%d hits=%d, want 0 and 3", d2.Requests(), c2.Hits)
	}
}

func TestBundle_SendsOnlyMisses(t *testing.T) {
	qs, keys, model := goldenCell(t, 2)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	writeFile(t, path, `{"key":"`+keys[1]+`","value":0.55}`+"\n")
	d := newFakeDecider()
	c := review.NewCache(path, d)
	c.Plan(qs)
	var got []float64
	for _, q := range qs {
		v, err := c.Decide(context.Background(), model, q)
		if err != nil {
			t.Fatal(err)
		}
		got = append(got, v)
	}
	if d.Requests() != 1 || len(d.requests[0]) != 2 {
		t.Fatalf("requests = %d of %d questions, want 1 request of 2", d.Requests(), d.Calls())
	}
	if d.requests[0][0].Instructions != qs[0].Instructions || d.requests[0][1].Instructions != qs[2].Instructions {
		t.Errorf("sent the wrong questions")
	}
	if got[0] != 0.9 || got[1] != 0.55 || got[2] != 0.9 {
		t.Errorf("values = %v, want [0.9 0.55 0.9]", got)
	}
}

func TestBundleCalls_OneRequestPerCell(t *testing.T) {
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	d := newFakeDecider()
	c := review.NewCache(path, d)
	var all []review.Query
	model := ""
	for i := 0; i < 4; i++ {
		qs, _, m := goldenCell(t, i)
		all, model = append(all, qs...), m
	}
	c.Plan(all)
	for _, q := range all {
		if _, err := c.Decide(context.Background(), model, q); err != nil {
			t.Fatal(err)
		}
	}
	if len(all) != 10 || d.Requests() != 4 || c.Calls != 4 || d.Calls() != 10 || c.Hits != 6 {
		t.Errorf("questions=%d requests=%d calls=%d sent=%d hits=%d, want 10/4/4/10/6", len(all), d.Requests(), c.Calls, d.Calls(), c.Hits)
	}
}

func TestBundleCalls_RunSendsOneRequestPerState(t *testing.T) {
	r := newRig(t)
	r.readEveryone(nil)
	before := r.decider.Requests()
	rep := r.clarity(false)
	if rep.Verdict != review.Pass {
		t.Fatalf("verdict = %s %s", rep.Verdict, findingCodes(rep))
	}
	states := map[string]bool{}
	for _, req := range r.decider.requests {
		if states[req[0].KeyState] {
			t.Errorf("two requests for the same state %q", req[0].KeyState)
		}
		states[req[0].KeyState] = true
	}
	// 2 probes with different states, then 4 distinct answers of 10 questions.
	if rep.Sent.Calls != r.decider.Requests()-before || r.decider.Requests() != 6 || r.decider.Calls() != 12 {
		t.Errorf("sent.calls=%d requests=%d (before the last run %d) questions=%d, want 6 requests for 12 questions", rep.Sent.Calls, r.decider.Requests(), before, r.decider.Calls())
	}
	if rep.Sent.Probe+rep.Sent.JudgeQueries != 32 || rep.Sent.Calls+rep.Sent.CacheHits != 32 {
		t.Errorf("sent = %+v, want 32 questions and calls+hits = 32", rep.Sent)
	}
}

func TestBundleFail_PartialResponseWritesNothingAndResends(t *testing.T) {
	qs, keys, model := goldenCell(t, 2)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	d := newFakeDecider()
	d.short = true
	c := review.NewCache(path, d)
	c.Plan(qs)
	for i, q := range qs {
		if _, err := c.Decide(context.Background(), model, q); err == nil {
			t.Errorf("query %d: a response with a missing value was accepted", i)
		}
	}
	if len(cacheLines(t, path)) != 0 {
		t.Errorf("cache written from a partial response: %q", readFile(t, path))
	}
	if d.Requests() != 1 {
		t.Errorf("requests = %d, want 1 (the failed group is not resent in the same run)", d.Requests())
	}

	// The next run sends the same three questions again.
	c2 := review.NewCache(path, d)
	c2.Plan(qs)
	c2.Decide(context.Background(), model, qs[0])
	if d.Requests() != 2 || len(d.requests[1]) != 3 {
		t.Errorf("rerun: requests=%d, last has %d questions; want 2 and 3", d.Requests(), len(d.requests[len(d.requests)-1]))
	}

	// One out-of-range value fails the whole request too.
	d3 := newFakeDecider()
	d3.values[keys[2]] = 1.5
	path3 := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	c3 := review.NewCache(path3, d3)
	c3.Plan(qs)
	if _, err := c3.Decide(context.Background(), model, qs[0]); err == nil || len(cacheLines(t, path3)) != 0 {
		t.Errorf("out-of-range value: err=%v lines=%d", err, len(cacheLines(t, path3)))
	}
}
