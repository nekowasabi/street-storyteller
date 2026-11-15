package review_test

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R6: the judge cache. Keys are seeded from the golden file, not computed by
// the code under test, so a wrong key derivation shows up as a miss.

func goldenQuery(t *testing.T) (review.Query, string, string) {
	t.Helper()
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	cell := g.Judge[0]
	qs := review.AnswerQueries(spec, spec.Asks[0], review.Ref(cell.Ref), cell.Answer)
	return qs[0], cell.Queries[0].Key, g.Model
}

func TestCache_HitDoesNotCallDecider(t *testing.T) {
	q, key, model := goldenQuery(t)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	writeFile(t, path, `{"key": "`+key+`", "value": 0.731}`+"\n")
	d := newFakeDecider()
	c := review.NewCache(path, d)
	v, err := c.Decide(context.Background(), model, q)
	if err != nil || v != 0.731 {
		t.Fatalf("Decide = %v, %v", v, err)
	}
	if d.Calls() != 0 {
		t.Errorf("decider called %d times on a hit", d.Calls())
	}
	if c.Hits != 1 || c.Calls != 0 {
		t.Errorf("Hits=%d Calls=%d", c.Hits, c.Calls)
	}
}

func TestCache_MissCallsOnceAndAppendsGoldenKey(t *testing.T) {
	q, key, model := goldenQuery(t)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	d := newFakeDecider()
	d.values[key] = 0.42
	c := review.NewCache(path, d)
	v, err := c.Decide(context.Background(), model, q)
	if err != nil || v != 0.42 {
		t.Fatalf("Decide = %v, %v", v, err)
	}
	if d.Calls() != 1 {
		t.Fatalf("decider calls = %d, want 1", d.Calls())
	}
	lines := strings.Split(strings.TrimSpace(readFile(t, path)), "\n")
	if len(lines) != 1 {
		t.Fatalf("cache lines = %q, want 1", lines)
	}
	var e struct {
		Key   string  `json:"key"`
		Value float64 `json:"value"`
	}
	if err := json.Unmarshal([]byte(lines[0]), &e); err != nil {
		t.Fatal(err)
	}
	if e.Key != key || e.Value != 0.42 {
		t.Errorf("appended %+v, want key %s value 0.42", e, key)
	}
	// Second call is a hit on the line just written.
	if _, err := c.Decide(context.Background(), model, q); err != nil || d.Calls() != 1 {
		t.Errorf("second Decide: err=%v calls=%d", err, d.Calls())
	}
}

func TestCache_OfflineMissIsError(t *testing.T) {
	q, _, model := goldenQuery(t)
	c := review.NewCache(filepath.Join(t.TempDir(), "judge-cache.jsonl"), nil)
	if _, err := c.Decide(context.Background(), model, q); err == nil {
		t.Fatal("offline miss returned no error")
	}
}

func TestCache_DeciderErrorPropagatesAndWritesNothing(t *testing.T) {
	q, _, model := goldenQuery(t)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	d := newFakeDecider()
	d.err = errors.New("HTTP 500")
	c := review.NewCache(path, d)
	if _, err := c.Decide(context.Background(), model, q); err == nil {
		t.Fatal("want error")
	}
	if exists(path) && strings.TrimSpace(readFile(t, path)) != "" {
		t.Errorf("cache written on failure: %q", readFile(t, path))
	}
}

func TestCache_LaterDuplicateKeyWins(t *testing.T) {
	q, key, model := goldenQuery(t)
	path := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	writeFile(t, path, `{"key":"`+key+`","value":0.1}`+"\n"+`{"key":"`+key+`","value":0.8}`+"\n")
	c := review.NewCache(path, newFakeDecider())
	if v, err := c.Decide(context.Background(), model, q); err != nil || v != 0.8 {
		t.Errorf("Decide = %v, %v; want 0.8 from the later line", v, err)
	}
}

func TestCache_KeyIsSHA256OfModelNewlineStateNewlineInstructions(t *testing.T) {
	q, key, model := goldenQuery(t)
	if q.Key(model) != key {
		t.Errorf("Key = %s, want golden %s", q.Key(model), key)
	}
	if q.Key(model) == q.Key("other-model") {
		t.Error("model does not enter the key")
	}
}
