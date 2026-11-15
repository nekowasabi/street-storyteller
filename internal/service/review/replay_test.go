package review_test

import (
	"bufio"
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/project/manifest"
	"github.com/takets/street-storyteller/internal/service/review"
)

// R7: replay of the second panel. Private data; the lead runs it with
//
//	STORYTELLER_REVIEW_REPLAY=<dir> go test ./internal/service/review/ -run Replay -v
//
// <dir> holds project/ (the work), answers/<agent>.md (each reader's full
// report), judge-cache.jsonl and judge.tsv (prayground r2/judge.tsv).
//
// judge.tsv is read by header names. Expected columns (aliases accepted):
// agent|reader, fact|id, ref, whole, items (";"-joined floats), status|decision.
// A missing column fails with the header printed, so the lead can rename here.

func TestReplay_SecondPanelMatchesJudgeTSV(t *testing.T) {
	dir := os.Getenv("STORYTELLER_REVIEW_REPLAY")
	if dir == "" {
		t.Skip("STORYTELLER_REVIEW_REPLAY is not set")
	}
	project := filepath.Join(dir, "project")
	m, err := manifest.Load(project)
	if err != nil {
		t.Fatalf("project manifest: %v", err)
	}
	// The manuscripts directory defaults to the manifest's paths.manuscripts;
	// STORYTELLER_REVIEW_REPLAY_MANUSCRIPTS (relative to project/) overrides it
	// for layouts such as manuscripts/01/v3.
	manuscripts := filepath.Join(project, m.Paths.Manuscripts)
	if sub := os.Getenv("STORYTELLER_REVIEW_REPLAY_MANUSCRIPTS"); sub != "" {
		manuscripts = filepath.Join(project, sub)
	}
	spec, _, err := review.LoadSpec(manuscripts)
	if err != nil {
		t.Fatalf("LoadSpec: %v", err)
	}
	if m.Review != nil {
		spec.Agents = m.Review.Agents
	}
	if len(spec.Agents) == 0 {
		// No roster in the manifest: the readers are whoever has a report.
		reports, _ := filepath.Glob(filepath.Join(dir, "answers", "*.md"))
		for _, r := range reports {
			spec.Agents = append(spec.Agents, review.Agent{Agent: strings.TrimSuffix(filepath.Base(r), ".md")})
		}
	}
	if len(spec.Agents) == 0 {
		t.Fatal("no agents: neither review.agents in the manifest nor answers/*.md")
	}
	if d := spec.Defects(); len(d) != 0 {
		t.Fatalf("stop-condition defects: %+v", d)
	}
	cells := spec.Cells()
	if len(cells) != 264 {
		t.Errorf("cells = %d, want 264", len(cells))
	}

	answers := review.Answers{}
	for _, a := range spec.Agents {
		report := readFile(t, filepath.Join(dir, "answers", a.Agent+".md"))
		ask := review.ParseAnswers(report, false)
		reask := review.ParseAnswers(report, true)
		for _, f := range spec.Asks {
			if !f.Ask.Main {
				continue
			}
			answers[review.Cell{Agent: a.Agent, Fact: f.ID, Ref: review.AskRef}] = ask[f.ID]
			answers[review.Cell{Agent: a.Agent, Fact: f.ID, Ref: review.ReaskRef}] = reask[f.ID]
		}
	}

	// The cache is copied so a miss cannot write into the private data.
	cachePath := filepath.Join(t.TempDir(), "judge-cache.jsonl")
	writeFile(t, cachePath, readFile(t, filepath.Join(dir, "judge-cache.jsonl")))
	cache := review.NewCache(cachePath, nil)
	values := review.Values{}
	var misses []string
	queries := review.JudgeQueries(spec, answers)
	for _, q := range queries {
		v, err := cache.Decide(context.Background(), spec.Profile.JudgeModel, q)
		if err != nil {
			misses = append(misses, q.Instructions)
			continue
		}
		values[q.Key(spec.Profile.JudgeModel)] = v
	}
	if len(queries) != 780 {
		t.Errorf("judge queries = %d, want 780", len(queries))
	}
	if len(misses) != 0 {
		t.Fatalf("%d cache misses (query text differs from prayground); first: %q", len(misses), misses[0])
	}
	if cache.Hits != 780 {
		t.Errorf("cache hits = %d, want 780", cache.Hits)
	}

	matrix := review.Decide(spec, answers, values, nil)
	want := readJudgeTSV(t, filepath.Join(dir, "judge.tsv"))
	if len(want) != 264 {
		t.Errorf("judge.tsv rows = %d, want 264", len(want))
	}
	for _, c := range matrix.Cells {
		w, ok := want[c.Cell]
		if !ok {
			t.Errorf("%+v: not in judge.tsv", c.Cell)
			continue
		}
		if !close3(c.Whole, w.whole) {
			t.Errorf("%+v: whole %.3f, judge.tsv %.3f", c.Cell, c.Whole, w.whole)
		}
		if len(c.Items) != len(w.items) {
			t.Errorf("%+v: %d items, judge.tsv %d", c.Cell, len(c.Items), len(w.items))
		} else {
			for i := range c.Items {
				if !close3(c.Items[i], w.items[i]) {
					t.Errorf("%+v item %d: %.3f, judge.tsv %.3f", c.Cell, i, c.Items[i], w.items[i])
				}
			}
		}
		if w.status != "" && c.Status != w.status {
			t.Errorf("%+v: status %s, judge.tsv %s", c.Cell, c.Status, w.status)
		}
	}
}

func close3(a, b float64) bool { return math.Abs(a-b) < 0.0005 }

func minOf(xs []float64) float64 {
	m := xs[0]
	for _, x := range xs[1:] {
		m = math.Min(m, x)
	}
	return m
}

type judgeRow struct {
	whole  float64
	items  []float64
	status string
}

func readJudgeTSV(t *testing.T, path string) map[review.Cell]judgeRow {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 64*1024), 8*1024*1024)
	var header []string
	col := func(names ...string) int {
		for i, h := range header {
			for _, n := range names {
				if strings.EqualFold(strings.TrimSpace(h), n) {
					return i
				}
			}
		}
		return -1
	}
	out := map[review.Cell]judgeRow{}
	for sc.Scan() {
		line := sc.Text()
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") {
			continue
		}
		cols := strings.Split(line, "\t")
		if header == nil {
			header = cols
			for _, want := range [][]string{{"agent", "reader", "persona"}, {"fact", "id"}, {"ref"}, {"whole"}, {"items"}} {
				if col(want...) < 0 {
					t.Fatalf("judge.tsv lacks column %v; header is %q (adjust the aliases in readJudgeTSV)", want, header)
				}
			}
			continue
		}
		row := judgeRow{}
		row.whole = parseFloat(t, cols[col("whole")])
		// prayground joins items with ","; ";" is accepted too.
		for _, s := range strings.FieldsFunc(cols[col("items")], func(r rune) bool { return r == ',' || r == ';' }) {
			if strings.TrimSpace(s) != "" {
				row.items = append(row.items, parseFloat(t, s))
			}
		}
		if i := col("status", "decision", "verdict"); i >= 0 && i < len(cols) {
			s := cols[i]
			// Why: "（著者）" marks a hold the author resolved. Replay compares
			// the judge's own verdict, so recompute it from the stored values.
			if strings.HasSuffix(s, "（著者）") {
				s = "hold"
				if row.whole >= 0.6 && len(row.items) > 0 && minOf(row.items) >= 0.5 {
					s = "stated"
				}
			}
			row.status = normalizeStatus(s)
		}
		// prayground writes ref as 問い#<id> / 再問#<id>.
		ref := cols[col("ref")]
		switch {
		case strings.HasPrefix(ref, "問い#"):
			ref = string(review.AskRef)
		case strings.HasPrefix(ref, "再問#"):
			ref = string(review.ReaskRef)
		}
		out[review.Cell{Agent: cols[col("agent", "reader", "persona")], Fact: cols[col("fact", "id")], Ref: review.Ref(ref)}] = row
	}
	if err := sc.Err(); err != nil {
		t.Fatal(err)
	}
	return out
}

func parseFloat(t *testing.T, s string) float64 {
	t.Helper()
	v, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil {
		t.Fatalf("judge.tsv value %q: %v", s, err)
	}
	return v
}

// normalizeStatus maps prayground's spelling onto Decide's statuses.
func normalizeStatus(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "stated", "ok", "pass", "yes":
		return "stated"
	case "unknown", "不明":
		return "unknown"
	case "hold", "保留", "pending":
		return "hold"
	case "missing", "欠落":
		return "missing"
	case "":
		return ""
	}
	return fmt.Sprintf("<%s>", s)
}
