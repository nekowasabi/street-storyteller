package review_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R3: the request bodies and cache keys must equal, byte for byte, what the
// prayground Python scripts sent. golden-queries.json was captured from them.

func TestGolden_ProbeRequestsMatch(t *testing.T) {
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	queries := review.ProbeQueries(spec, rainkeyText(t, rainkeyDir))
	if len(queries) != len(g.Probe) {
		t.Fatalf("probe queries = %d, want %d", len(queries), len(g.Probe))
	}
	for i, want := range g.Probe {
		q := queries[i]
		if q.Name != "fact" {
			t.Errorf("[%s] Name = %q, want fact", want.Fact, q.Name)
		}
		got := q.Request(g.Model)
		if !sameJSON(t, got, want.Request) {
			t.Errorf("[%s] request differs\n got: %s\nwant: %s", want.Fact, canonicalJSON(t, got), canonicalJSON(t, want.Request))
		}
		// KeyState is the encoding/json form of the state array.
		if canonicalJSON(t, []byte(q.KeyState)) != canonicalJSON(t, q.State) {
			t.Errorf("[%s] KeyState %q is not the JSON of State", want.Fact, q.KeyState)
		}
	}
}

func TestGolden_JudgeRequestsAndKeysMatch(t *testing.T) {
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	total := 0
	for _, cell := range g.Judge {
		var fact review.FactAsk
		for _, f := range spec.Asks {
			if f.ID == cell.Fact {
				fact = f
			}
		}
		queries := review.AnswerQueries(spec, fact, review.Ref(cell.Ref), cell.Answer)
		if len(queries) != len(cell.Queries) {
			t.Fatalf("[%s:%s] queries = %d, want %d", cell.Fact, cell.Ref, len(queries), len(cell.Queries))
		}
		for i, want := range cell.Queries {
			q := queries[i]
			total++
			if q.Name != "f" {
				t.Errorf("[%s:%s/%s] Name = %q, want f", cell.Fact, cell.Ref, want.Item, q.Name)
			}
			if q.Instructions != want.Instructions {
				t.Errorf("[%s:%s/%s] instructions differ\n got: %q\nwant: %q", cell.Fact, cell.Ref, want.Item, q.Instructions, want.Instructions)
			}
			if !sameJSON(t, q.Request(g.Model), want.Request) {
				t.Errorf("[%s:%s/%s] request differs\n got: %s\nwant: %s", cell.Fact, cell.Ref, want.Item, canonicalJSON(t, q.Request(g.Model)), canonicalJSON(t, want.Request))
			}
			if got := q.Key(g.Model); got != want.Key {
				t.Errorf("[%s:%s/%s] key = %s, want %s", cell.Fact, cell.Ref, want.Item, got, want.Key)
			}
		}
	}
	if total != 10 {
		t.Errorf("judge queries = %d, want 10 (4 cells)", total)
	}
}

// The golden holds 2 probes + 4 cells; JudgeQueries over the declared cells of
// one agent must reproduce exactly those 10 queries, in cell order.
func TestGolden_JudgeQueriesCoverDeclaredCells(t *testing.T) {
	g := loadGolden(t)
	spec := goldenSpec(t, g)
	spec.Agents = []review.Agent{{Agent: "P1", Runtime: "codex"}}
	answers := review.Answers{}
	wantKeys := map[string]bool{}
	for _, cell := range g.Judge {
		answers[review.Cell{Agent: "P1", Fact: cell.Fact, Ref: review.Ref(cell.Ref)}] = cell.Answer
		for _, q := range cell.Queries {
			wantKeys[q.Key] = true
		}
	}
	queries := review.JudgeQueries(spec, answers)
	if len(queries) != 10 {
		t.Fatalf("JudgeQueries = %d, want 10", len(queries))
	}
	for _, q := range queries {
		if !wantKeys[q.Key(g.Model)] {
			t.Errorf("unexpected key %s for %q", q.Key(g.Model), q.Instructions)
		}
	}
}
