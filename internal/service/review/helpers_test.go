package review_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/service"
	"github.com/takets/street-storyteller/internal/service/review"
)

// Every name the contract does not fix lives in this file, so adapting the
// tests to the product code is a one-file edit.

const rainkeyDir = "testdata/rainkey"

// golden mirrors golden-queries.json. The file was captured from the real
// prayground scripts, so it is the source of truth for the byte-exact queries.
type golden struct {
	Model string `json:"model"`
	Probe []struct {
		Fact      string          `json:"fact"`
		Deadline  int             `json:"deadline"`
		Statement string          `json:"statement"`
		Request   json.RawMessage `json:"request"`
	} `json:"probe"`
	Judge []struct {
		Fact     string   `json:"fact"`
		Ref      string   `json:"ref"`
		Question string   `json:"question"`
		Must     []string `json:"must"`
		Extra    string   `json:"extra"`
		Answer   string   `json:"answer"`
		Queries  []struct {
			Item         string          `json:"item"`
			Instructions string          `json:"instructions"`
			Key          string          `json:"key"`
			Request      json.RawMessage `json:"request"`
		} `json:"queries"`
	} `json:"judge"`
}

func loadGolden(t *testing.T) golden {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(rainkeyDir, "golden-queries.json"))
	if err != nil {
		t.Fatalf("golden: %v", err)
	}
	var g golden
	if err := json.Unmarshal(b, &g); err != nil {
		t.Fatalf("golden: %v", err)
	}
	return g
}

// goldenSpec builds the Spec from the golden file alone, so the query tests do
// not depend on the proposition loader. Reask is read off the reask question:
// the at-deadline form carries the "（N章を読み終えた時点で）" prefix.
func goldenSpec(t *testing.T, g golden) review.Spec {
	t.Helper()
	spec := review.Spec{Profile: review.DefaultProfile()}
	for _, p := range g.Probe {
		f := review.FactAsk{ID: p.Fact, Statement: p.Statement, Deadline: p.Deadline, Ask: domain.Ask{Main: true, Reask: domain.ReaskNow}}
		for _, j := range g.Judge {
			if j.Fact != p.Fact {
				continue
			}
			f.Ask.Answer = domain.AnswerKey{Must: j.Must, Extra: j.Extra}
			if j.Ref == "ask" {
				f.Ask.Question = j.Question
			} else if strings.HasPrefix(j.Question, "（") {
				f.Ask.Reask = domain.ReaskAtDeadline
			}
		}
		spec.Asks = append(spec.Asks, f)
	}
	return spec
}

func rainkeyChapters(t *testing.T, dir string) []service.ChapterStances {
	t.Helper()
	ch, err := service.WalkStances(filepath.Join(dir, "manuscripts"))
	if err != nil {
		t.Fatalf("WalkStances: %v", err)
	}
	return ch
}

func rainkeyText(t *testing.T, dir string) review.ReaderText {
	t.Helper()
	var text review.ReaderText
	for _, c := range rainkeyChapters(t, dir) {
		b, err := os.ReadFile(c.File)
		if err != nil {
			t.Fatal(err)
		}
		text = append(text, review.BodyOf(string(b)))
	}
	return text
}

func rainkeyAgents() []review.Agent {
	return []review.Agent{
		{Agent: "P1", Runtime: "claude-code", Model: "claude-fable-5-1", Effort: "medium"},
		{Agent: "P2", Runtime: "codex", Model: "gpt-6.1-sol", Effort: "medium"},
		{Agent: "P3", Runtime: "grok-build", Model: "grok-4.7", Effort: "medium"},
	}
}

// copyRainkey copies the sample project into a temp dir so tests may edit it
// and so Run/Turn write their records outside the repository.
func copyRainkey(t *testing.T) string {
	t.Helper()
	dst := t.TempDir()
	err := filepath.WalkDir(rainkeyDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(rainkeyDir, path)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			// .storyteller/review/ is runtime state (a live run may leave a
			// real judge cache there); every test starts from a clean one.
			if d.Name() == ".storyteller" {
				return filepath.SkipDir
			}
			return os.MkdirAll(target, 0o755)
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
	if err != nil {
		t.Fatalf("copy rainkey: %v", err)
	}
	return dst
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(b)
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// canonicalJSON re-encodes v so two JSON documents compare by value.
func canonicalJSON(t *testing.T, v any) string {
	t.Helper()
	var b []byte
	var err error
	switch x := v.(type) {
	case json.RawMessage:
		b = x
	case []byte:
		b = x
	default:
		b, err = json.Marshal(x)
		if err != nil {
			t.Fatal(err)
		}
	}
	var tree any
	if err := json.Unmarshal(b, &tree); err != nil {
		t.Fatalf("not JSON: %v\n%s", err, b)
	}
	out, err := json.Marshal(tree)
	if err != nil {
		t.Fatal(err)
	}
	return string(out)
}

func sameJSON(t *testing.T, a, b any) bool {
	t.Helper()
	return reflect.DeepEqual(canonicalJSON(t, a), canonicalJSON(t, b))
}

// fakeDecider answers from a table keyed by Query.Key(model) and records calls.
type fakeDecider struct {
	mu     sync.Mutex
	values map[string]float64
	err    error
	calls  []review.Query
	models map[string]bool
}

func newFakeDecider() *fakeDecider {
	return &fakeDecider{values: map[string]float64{}, models: map[string]bool{}}
}

func (d *fakeDecider) Decide(_ context.Context, model string, q review.Query) (float64, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.calls = append(d.calls, q)
	d.models[model] = true
	if d.err != nil {
		return 0, d.err
	}
	v, ok := d.values[q.Key(model)]
	if !ok {
		return 0.9, nil
	}
	return v, nil
}

func (d *fakeDecider) Calls() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.calls)
}

// fakeLauncher records launches and lets a test fail the next launch.
type fakeLauncher struct {
	mu       sync.Mutex
	launches []fakeLaunch
	closed   []review.LaunchHandle
	failNext error
}

type fakeLaunch struct {
	ID, Dir string
	Agent   review.AgentLaunch
}

func (l *fakeLauncher) Launch(_ context.Context, id, dir string, agent review.AgentLaunch) (review.LaunchHandle, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.failNext != nil {
		err := l.failNext
		l.failNext = nil
		return review.LaunchHandle{}, err
	}
	l.launches = append(l.launches, fakeLaunch{id, dir, agent})
	return review.LaunchHandle{ID: id, RunID: "run-" + id}, nil
}

func (l *fakeLauncher) Close(_ context.Context, h review.LaunchHandle) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.closed = append(l.closed, h)
	return nil
}

func (l *fakeLauncher) Launches() []fakeLaunch {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]fakeLaunch(nil), l.launches...)
}

func (l *fakeLauncher) Closed() []review.LaunchHandle {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]review.LaunchHandle(nil), l.closed...)
}
