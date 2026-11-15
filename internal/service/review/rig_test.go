package review_test

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/service/review"
)

// rig is one sample project copied to a temp dir plus every Deps fake. Run and
// Turn are driven through the same entry points the CLI uses.
type rig struct {
	t        *testing.T
	root     string
	path     string
	decider  *fakeDecider
	launcher *fakeLauncher
	now      time.Time
	waited   time.Duration
	deps     review.Deps
}

func newRig(t *testing.T) *rig {
	t.Helper()
	r := &rig{t: t, root: copyRainkey(t), decider: newFakeDecider(), launcher: &fakeLauncher{}, now: time.Date(2026, 11, 15, 9, 0, 0, 0, time.UTC)}
	r.path = filepath.Join(r.root, "manuscripts")
	r.deps = review.Deps{
		Decider:  r.decider,
		Launcher: r.launcher,
		Now:      func() time.Time { return r.now },
		Wait: func(_ context.Context, d time.Duration) error {
			r.waited += d
			r.now = r.now.Add(d)
			return nil
		},
		WorkRoot: t.TempDir(),
		MapRoot:  t.TempDir(),
	}
	return r
}

func (r *rig) advance(d time.Duration) { r.now = r.now.Add(d) }

func (r *rig) request(kind review.Kind) review.Request {
	return review.Request{Kind: kind, Path: r.path, Wait: time.Second}
}

func (r *rig) run(req review.Request) review.Report {
	return review.Run(context.Background(), req, r.deps)
}

func (r *rig) clarity(team bool) review.Report {
	req := r.request(review.Clarity)
	req.Team = team
	return r.run(req)
}

func (r *rig) runID() string {
	req := r.request(review.Clarity)
	req.DryRun = true
	rep := r.run(req)
	if rep.Run == "" {
		r.t.Fatalf("dry run gave no run id: %+v", rep)
	}
	return rep.Run
}

func (r *rig) turn(run, agent string, step int, notes, answers string) review.TurnReply {
	return review.Turn(context.Background(), review.TurnRequest{Run: run, Agent: agent, Step: step, Notes: notes, AnswersText: answers}, r.deps)
}

func (r *rig) workDir(run, agent string) string {
	return filepath.Join(r.deps.WorkRoot, run+"-"+agent)
}

// goldenAnswers are the sample reader's answers from golden-queries.json, keyed
// by "<fact>" for the ask and "<fact>（再）" for the reask.
func goldenAnswers(t *testing.T) map[string]string {
	t.Helper()
	out := map[string]string{}
	for _, c := range loadGolden(t).Judge {
		k := c.Fact
		if c.Ref == "reask" {
			k += "（再）"
		}
		out[k] = c.Answer
	}
	return out
}

// readAll drives one agent through every clarity step with the golden
// answers, overriding answers for the given keys ("loc", "door（再）", ...).
func (r *rig) readAll(run, agent string, override map[string]string) review.TurnReply {
	r.t.Helper()
	answers := goldenAnswers(r.t)
	for k, v := range override {
		answers[k] = v
	}
	var reply review.TurnReply
	for step := 1; step <= 20; step++ {
		dir := r.workDir(run, agent)
		var file string
		if step == 1 {
			file = "chapter01.md"
		} else {
			file = reply.File
		}
		if strings.HasPrefix(file, "ask-") {
			var lines []string
			for _, id := range reply.Asks {
				k := id
				if file == "ask-final.md" {
					k += "（再）"
					lines = append(lines, fmt.Sprintf("%s（再）. %s", id, answers[k]))
				} else {
					lines = append(lines, fmt.Sprintf("%s. %s", id, answers[k]))
				}
			}
			reply = r.turn(run, agent, step, "", strings.Join(lines, "\n")+"\n")
		} else {
			if !exists(filepath.Join(dir, file)) {
				r.t.Fatalf("%s step %d: %s not placed", agent, step, file)
			}
			reply = r.turn(run, agent, step, fmt.Sprintf("%s を読んだ (%d:1)", file, step), "")
		}
		if reply.Error != "" {
			r.t.Fatalf("%s step %d: %s", agent, step, reply.Error)
		}
		if reply.Done {
			return reply
		}
	}
	r.t.Fatalf("%s did not finish in 20 steps", agent)
	return reply
}

// readEveryone launches the panel and reads every chapter with every agent.
// It returns the run id.
func (r *rig) readEveryone(override map[string]string) string {
	r.t.Helper()
	rep := r.clarity(true)
	if rep.Verdict != review.Reading {
		r.t.Fatalf("first --team run = %s %+v", rep.Verdict, rep.Findings)
	}
	for _, a := range rainkeyAgents() {
		r.readAll(rep.Run, a.Agent, override)
	}
	return rep.Run
}

func findingCodes(rep review.Report) string {
	var codes []string
	for _, f := range rep.Findings {
		codes = append(codes, f.Code)
	}
	return strings.Join(codes, ",")
}

func (r *rig) manifestReplace(old, new string) {
	r.t.Helper()
	path := filepath.Join(r.root, ".storyteller.json")
	content := readFile(r.t, path)
	if !strings.Contains(content, old) {
		r.t.Fatalf("manifest lacks %q", old)
	}
	writeFile(r.t, path, strings.Replace(content, old, new, 1))
}

func (r *rig) fileReplace(rel, old, new string) {
	r.t.Helper()
	path := filepath.Join(r.root, rel)
	content := readFile(r.t, path)
	if !strings.Contains(content, old) {
		r.t.Fatalf("%s lacks %q", rel, old)
	}
	writeFile(r.t, path, strings.Replace(content, old, new, -1))
}

// probeKeys returns the cache keys of the two probe queries for the sample.
func (r *rig) probeKeys() []string {
	r.t.Helper()
	spec, text, err := review.LoadSpec(r.path)
	if err != nil {
		r.t.Fatal(err)
	}
	var keys []string
	for _, q := range review.ProbeQueries(spec, text) {
		keys = append(keys, q.Key(spec.Profile.JudgeModel))
	}
	return keys
}

// cellKeys returns the cache keys for one agent's cell with the given answer.
func (r *rig) cellKeys(fact string, ref review.Ref, answer string) []string {
	r.t.Helper()
	spec, _, err := review.LoadSpec(r.path)
	if err != nil {
		r.t.Fatal(err)
	}
	var f review.FactAsk
	for _, x := range spec.Asks {
		if x.ID == fact {
			f = x
		}
	}
	var keys []string
	for _, q := range review.AnswerQueries(spec, f, ref, answer) {
		keys = append(keys, q.Key(spec.Profile.JudgeModel))
	}
	return keys
}
