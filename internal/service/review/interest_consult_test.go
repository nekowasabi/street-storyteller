package review_test

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R12: interest and consult.

func TestInterest_LaunchesEveryAgentWithPersonaAndAllChaptersVerbatim(t *testing.T) {
	r := newRig(t)
	req := r.request(review.Interest)
	req.Instruction = "山場の弱い所を教えてほしい"
	rep := r.run(req)
	if rep.Verdict != review.Reading || rep.ExitCode() != 5 {
		t.Fatalf("verdict = %s %s", rep.Verdict, findingCodes(rep))
	}
	launches := r.launcher.Launches()
	if len(launches) != 3 {
		t.Fatalf("launches = %d, want all 3 agents", len(launches))
	}
	for i, l := range launches {
		a := rainkeyAgents()[i]
		if l.Agent.Agent != a.Agent || l.Agent.Prompt != review.LaunchPrompt {
			t.Errorf("launch = %+v", l.Agent)
		}
		for _, c := range []string{"chapter01.md", "chapter02.md", "chapter03.md", "chapter04.md"} {
			if readFile(t, filepath.Join(l.Dir, c)) != readFile(t, filepath.Join(r.path, c)) {
				t.Errorf("%s/%s is not the original file", l.Dir, c)
			}
		}
		readme := readFile(t, filepath.Join(l.Dir, "README.md"))
		if !strings.Contains(readme, "山場の弱い所") || strings.Contains(readme, "{{") || !strings.Contains(readme, "--agent "+a.Agent) {
			t.Errorf("README for %s:\n%s", a.Agent, readme)
		}
	}
	if !strings.Contains(readFile(t, filepath.Join(launches[2].Dir, "README.md")), "ハードSF") {
		t.Error("P3 README lacks persona P3")
	}
	if r.decider.Calls() != 0 {
		t.Errorf("interest called the judge %d times", r.decider.Calls())
	}
	// One step per agent; all replies collected in roster order.
	for _, a := range rainkeyAgents() {
		reply := r.turn(rep.Run, a.Agent, 1, "面白かった: "+a.Agent, "")
		if reply.Error != "" || !reply.Done || reply.Of != 1 {
			t.Errorf("%s turn = %+v", a.Agent, reply)
		}
	}
	done := r.run(req)
	if done.Verdict != review.Done || done.ExitCode() != 0 || len(done.Replies) != 3 {
		t.Fatalf("done = %s replies=%+v", done.Verdict, done.Replies)
	}
	for i, a := range rainkeyAgents() {
		if done.Replies[i].Agent != a.Agent || done.Replies[i].Notes != "面白かった: "+a.Agent || done.Replies[i].Runtime != a.Runtime {
			t.Errorf("reply %d = %+v", i, done.Replies[i])
		}
	}
	if len(r.launcher.Closed()) != 3 {
		t.Errorf("closed = %d", len(r.launcher.Closed()))
	}
}

func TestConsult_LaunchesOneAgentPerRuntimeWithoutPersona(t *testing.T) {
	r := newRig(t)
	// Two agents share the codex runtime; consult must launch only the first.
	r.manifestReplace(`{"agent": "P3", "runtime": "grok-build", "model": "grok-4.7", "effort": "medium"}`,
		`{"agent": "P3", "runtime": "codex", "model": "gpt-6.1-mini", "effort": "low"}`)
	req := r.request(review.Consult)
	req.Instruction = "8章の山場が弱く感じる。削れる場面を相談したい"
	rep := r.run(req)
	if rep.Verdict != review.Reading {
		t.Fatalf("verdict = %s %s", rep.Verdict, findingCodes(rep))
	}
	launches := r.launcher.Launches()
	if len(launches) != 2 || launches[0].Agent.Agent != "P1" || launches[1].Agent.Agent != "P2" {
		t.Fatalf("launches = %+v, want P1 (claude-code) and P2 (codex)", launches)
	}
	readme := readFile(t, filepath.Join(launches[0].Dir, "README.md"))
	if strings.Contains(readme, "中学2年生") || strings.Contains(readme, "{{") || !strings.Contains(readme, "削れる場面を相談したい") {
		t.Errorf("consult README:\n%s", readme)
	}
	if readFile(t, filepath.Join(launches[0].Dir, "chapter03.md")) != readFile(t, filepath.Join(r.path, "chapter03.md")) {
		t.Error("consult copy is not verbatim")
	}
	for _, a := range []string{"P1", "P2"} {
		if reply := r.turn(rep.Run, a, 1, "案1…", ""); reply.Error != "" || !reply.Done {
			t.Errorf("%s turn = %+v", a, reply)
		}
	}
	done := r.run(req)
	if done.Verdict != review.Done || len(done.Replies) != 2 {
		t.Errorf("done = %s replies=%d", done.Verdict, len(done.Replies))
	}
}

func TestConsult_WithoutInstructionIsUsage(t *testing.T) {
	r := newRig(t)
	rep := r.run(r.request(review.Consult))
	if rep.Verdict != review.Usage || rep.ExitCode() != 2 || len(r.launcher.Launches()) != 0 {
		t.Errorf("verdict = %s exit=%d launches=%d", rep.Verdict, rep.ExitCode(), len(r.launcher.Launches()))
	}
}

func TestInterest_DifferentInstructionIsDifferentRun(t *testing.T) {
	r := newRig(t)
	req := r.request(review.Interest)
	req.Instruction = "a"
	a := r.run(req)
	req.Instruction = "b"
	b := r.run(req)
	if a.Run == b.Run {
		t.Error("instruction does not enter the run id")
	}
	if len(r.launcher.Closed()) != 3 {
		t.Errorf("old interest launches closed = %d, want 3", len(r.launcher.Closed()))
	}
}
