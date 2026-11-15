package review_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R9: review.Run and the design's break table.

func TestRun_FullClarityFlowPasses(t *testing.T) {
	r := newRig(t)
	run := r.readEveryone(nil)
	rep := r.clarity(false)
	if rep.Verdict != review.Pass || rep.Run != run {
		t.Fatalf("after everyone read: %s %s %+v", rep.Verdict, findingCodes(rep), rep.Error)
	}
	if rep.Cells == nil || rep.Cells.Declared != 12 || rep.Cells.Stated != 12 {
		t.Errorf("tally = %+v, want 12/12", rep.Cells)
	}
	if rep.Stage != "judge" || rep.Criteria == "" {
		t.Errorf("stage=%s criteria=%q", rep.Stage, rep.Criteria)
	}
	if len(r.launcher.Closed()) != 3 {
		t.Errorf("closed launches = %d, want 3", len(r.launcher.Closed()))
	}
	// 2 probes + 10 distinct judge queries: the three readers gave the same
	// answers, so the other 20 queries share their keys and hit the cache.
	if r.decider.Calls() != 12 {
		t.Errorf("decider calls = %d, want 12", r.decider.Calls())
	}
	if rep.Sent == nil || rep.Sent.Calls+rep.Sent.CacheHits != 32 {
		t.Errorf("sent = %+v, want calls+hits = 32", rep.Sent)
	}
	if again := r.clarity(false); again.Verdict != review.Pass || r.decider.Calls() != 12 {
		t.Errorf("second pass: %s, calls=%d (want all cache hits)", again.Verdict, r.decider.Calls())
	}
}

func TestRun_LaunchPromptHasNoBodyNoPathAndAgentsLaunchOneByOne(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(true)
	if rep.Verdict != review.Reading || rep.ExitCode() != 5 {
		t.Fatalf("verdict = %s exit=%d %+v", rep.Verdict, rep.ExitCode(), rep.Findings)
	}
	launches := r.launcher.Launches()
	if len(launches) != 3 {
		t.Fatalf("launches = %d, want 3", len(launches))
	}
	for i, l := range launches {
		a := rainkeyAgents()[i]
		if l.ID != rep.Run+"-"+a.Agent+"-a1" {
			t.Errorf("launch id = %s, want %s", l.ID, rep.Run+"-"+a.Agent+"-a1")
		}
		if l.Agent.Agent != a.Agent || l.Agent.Runtime != a.Runtime || l.Agent.Model != a.Model || l.Agent.Effort != a.Effort {
			t.Errorf("launch agent = %+v, want %+v", l.Agent, a)
		}
		if l.Agent.Prompt != review.LaunchPrompt {
			t.Errorf("prompt = %q", l.Agent.Prompt)
		}
		for _, forbidden := range []string{"旅人", "宿", r.root, "manuscripts"} {
			if strings.Contains(l.Agent.Prompt, forbidden) {
				t.Errorf("prompt leaks %q", forbidden)
			}
		}
		if l.Dir != r.workDir(rep.Run, a.Agent) {
			t.Errorf("dir = %s, want %s", l.Dir, r.workDir(rep.Run, a.Agent))
		}
		if strings.HasPrefix(l.Dir, r.root) {
			t.Errorf("work dir %s is inside the project", l.Dir)
		}
		if !exists(filepath.Join(l.Dir, "README.md")) || !exists(filepath.Join(l.Dir, "chapter01.md")) {
			t.Errorf("%s lacks README.md or chapter01.md", l.Dir)
		}
		if exists(filepath.Join(l.Dir, "chapter02.md")) || exists(filepath.Join(l.Dir, "ask-01.md")) {
			t.Errorf("%s already has later steps", l.Dir)
		}
	}
	readme := readFile(t, filepath.Join(launches[0].Dir, "README.md"))
	if strings.Contains(readme, "{{") {
		t.Errorf("README has unfilled placeholders:\n%s", readme)
	}
	if !strings.Contains(readme, "storyteller review turn --run "+rep.Run+" --agent P1") {
		t.Errorf("README lacks the turn command:\n%s", readme)
	}
	if !strings.Contains(readme, "中学2年生") {
		t.Errorf("README lacks persona P1:\n%s", readme)
	}
	if len(rep.Agents) != 3 || rep.Agents[0].Of != 7 || rep.Agents[0].Step != 0 {
		t.Errorf("agents = %+v, want 3 × 0/7", rep.Agents)
	}
}

func TestRun_WithoutTeamAndNoRecordsIsAuthorNoLaunch(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(false)
	if rep.Verdict != review.Author || rep.ExitCode() != 3 || !strings.Contains(findingCodes(rep), "REV-304") {
		t.Errorf("verdict = %s exit=%d codes=%s", rep.Verdict, rep.ExitCode(), findingCodes(rep))
	}
	if len(r.launcher.Launches()) != 0 {
		t.Errorf("launched without --team: %+v", r.launcher.Launches())
	}
}

func TestRun_TeamWithoutRosterIsAuthorNoLaunch(t *testing.T) {
	r := newRig(t)
	r.manifestReplace(`"agents": [`, `"agents_off": [`)
	rep := r.clarity(true)
	if rep.Verdict != review.Author || !strings.Contains(findingCodes(rep), "REV-305") {
		t.Errorf("verdict = %s codes=%s", rep.Verdict, findingCodes(rep))
	}
	if len(r.launcher.Launches()) != 0 {
		t.Errorf("launched without roster: %+v", r.launcher.Launches())
	}

	r2 := newRig(t)
	r2.manifestReplace(`"launcher": {"ateam": "ateam.sh"},`, ``)
	if rep := r2.clarity(true); rep.Verdict != review.Author || !strings.Contains(findingCodes(rep), "REV-305") || len(r2.launcher.Launches()) != 0 {
		t.Errorf("no ateam path: %s %s launches=%d", rep.Verdict, findingCodes(rep), len(r2.launcher.Launches()))
	}
}

func TestRun_NoJudgeConfigIsAuthorAndSendsNothing(t *testing.T) {
	r := newRig(t)
	r.manifestReplace(`"judge": "openrouter:google/gemini-decision-1",`, ``)
	rep := r.clarity(true)
	if rep.Verdict != review.Author || !strings.Contains(findingCodes(rep), "REV-303") {
		t.Errorf("verdict = %s codes=%s", rep.Verdict, findingCodes(rep))
	}
	if r.decider.Calls() != 0 || len(r.launcher.Launches()) != 0 {
		t.Errorf("sent %d judge calls, %d launches", r.decider.Calls(), len(r.launcher.Launches()))
	}

	r2 := newRig(t)
	r2.manifestReplace(`openrouter:google/gemini-decision-1`, `openrouter:other/model`)
	if rep := r2.clarity(true); rep.Verdict != review.Author || !strings.Contains(findingCodes(rep), "REV-303") || r2.decider.Calls() != 0 {
		t.Errorf("wrong judge model: %s %s calls=%d", rep.Verdict, findingCodes(rep), r2.decider.Calls())
	}
}

func TestRun_ProbeBelowThresholdIsEditAndNoLaunch(t *testing.T) {
	r := newRig(t)
	for _, k := range r.probeKeys() {
		r.decider.values[k] = 0.1
	}
	rep := r.clarity(true)
	if rep.Verdict != review.Edit || rep.ExitCode() != 1 || !strings.Contains(findingCodes(rep), "REV-201") {
		t.Errorf("verdict = %s exit=%d codes=%s", rep.Verdict, rep.ExitCode(), findingCodes(rep))
	}
	if len(r.launcher.Launches()) != 0 {
		t.Errorf("launched after a failed probe: %+v", r.launcher.Launches())
	}
}

func TestRun_StructureViolationIsEditWithRDRCode(t *testing.T) {
	r := newRig(t)
	// Chapter 3 requires loc:shown; dropping the marker and declaration from chapter 2 breaks RDR-102.
	r.fileReplace("manuscripts/chapter02.md", `    - "loc:shown"`+"\n", "")
	r.fileReplace("manuscripts/chapter02.md", "<!-- shows: loc:shown -->\n", "")
	rep := r.clarity(true)
	if rep.Verdict != review.Edit || rep.Stage != "structure" || !strings.Contains(findingCodes(rep), "RDR-") {
		t.Errorf("verdict = %s stage=%s codes=%s", rep.Verdict, rep.Stage, findingCodes(rep))
	}
	if r.decider.Calls() != 0 || len(r.launcher.Launches()) != 0 {
		t.Errorf("probe or launch ran despite structure failure")
	}
}

func TestRun_MissingReaskIsAuthorREV301(t *testing.T) {
	r := newRig(t)
	r.fileReplace("src/propositions/door.ts", `    reask: "now"`+"\n", "")
	rep := r.clarity(true)
	if rep.Verdict != review.Author || !strings.Contains(findingCodes(rep), "REV-301") || len(r.launcher.Launches()) != 0 {
		t.Errorf("verdict = %s codes=%s launches=%d", rep.Verdict, findingCodes(rep), len(r.launcher.Launches()))
	}
}

func TestRun_StillReadingIsReadingThenDoneAfterTurns(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(true)
	run := rep.Run
	r.readAll(run, "P1", nil)
	r.readAll(run, "P2", nil)
	mid := r.clarity(false)
	if mid.Verdict != review.Reading || mid.ExitCode() != 5 {
		t.Fatalf("with P3 unfinished: %s", mid.Verdict)
	}
	if len(r.launcher.Launches()) != 3 {
		t.Errorf("re-run launched again: %d", len(r.launcher.Launches()))
	}
	done := 0
	for _, a := range mid.Agents {
		if a.Done {
			done++
		}
	}
	if done != 2 {
		t.Errorf("agents = %+v, want 2 done", mid.Agents)
	}
	r.readAll(run, "P3", nil)
	if final := r.clarity(false); final.Verdict != review.Pass {
		t.Errorf("after P3: %s %s", final.Verdict, findingCodes(final))
	}
}

func TestRun_LockPresentReturnsReadingWithoutLaunch(t *testing.T) {
	r := newRig(t)
	run := r.runID()
	writeFile(t, filepath.Join(r.root, ".storyteller", "review", "runs", run, "lock"), "")
	if err := os.Chtimes(filepath.Join(r.root, ".storyteller", "review", "runs", run, "lock"), r.now, r.now); err != nil {
		t.Fatal(err)
	}
	rep := r.clarity(true)
	if rep.Verdict != review.Reading || len(r.launcher.Launches()) != 0 {
		t.Errorf("verdict = %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
	// A lock older than 5 minutes is taken over.
	r.advance(6 * time.Minute)
	if rep := r.clarity(true); rep.Verdict != review.Reading || len(r.launcher.Launches()) != 3 {
		t.Errorf("stale lock: %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
}

func TestRun_StalledAgentIsErrorAndRelaunchedTwiceOnly(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(true)
	run := rep.Run
	r.readAll(run, "P1", nil)
	r.readAll(run, "P2", nil)
	r.advance(61 * time.Minute)
	stalled := r.clarity(true)
	if stalled.Verdict != review.Error || stalled.ExitCode() != 4 || !strings.Contains(findingCodes(stalled), "REV-402") {
		t.Fatalf("stalled: %s %s", stalled.Verdict, findingCodes(stalled))
	}
	if closed := r.launcher.Closed(); len(closed) != 1 || closed[0].ID != run+"-P3-a1" {
		t.Errorf("closed = %+v, want only P3 a1", closed)
	}
	// Second attempt relaunches only P3 with a new id and a fresh chapter 1.
	again := r.clarity(true)
	launches := r.launcher.Launches()
	if again.Verdict != review.Reading || len(launches) != 4 || launches[3].ID != run+"-P3-a2" {
		t.Fatalf("relaunch: %s launches=%+v", again.Verdict, launches)
	}
	if exists(filepath.Join(r.workDir(run, "P3"), "chapter02.md")) {
		t.Error("relaunched agent still has later files")
	}
	r.advance(61 * time.Minute)
	if rep := r.clarity(true); !strings.Contains(findingCodes(rep), "REV-402") {
		t.Fatalf("second stall: %s", findingCodes(rep))
	}
	if rep := r.clarity(true); rep.Verdict != review.Reading || len(r.launcher.Launches()) != 5 || r.launcher.Launches()[4].ID != run+"-P3-a3" {
		t.Fatalf("third attempt: %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
	r.advance(61 * time.Minute)
	if rep := r.clarity(true); !strings.Contains(findingCodes(rep), "REV-402") {
		t.Fatalf("third stall: %s", findingCodes(rep))
	}
	rep = r.clarity(true)
	if rep.Verdict != review.Error || len(r.launcher.Launches()) != 5 {
		t.Errorf("fourth attempt must not launch: %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
	// Progress inside the stall window resets the clock: every reader reads chapter 1 after 50 minutes, then 50 more pass.
	r2 := newRig(t)
	run2 := r2.clarity(true).Run
	r2.advance(50 * time.Minute)
	for _, a := range rainkeyAgents() {
		if reply := r2.turn(run2, a.Agent, 1, "読んだ", ""); reply.Error != "" {
			t.Fatal(reply.Error)
		}
	}
	r2.advance(50 * time.Minute)
	if rep := r2.clarity(false); rep.Verdict != review.Reading {
		t.Errorf("progress 50 min ago is not a stall: %s %s", rep.Verdict, findingCodes(rep))
	}
}

func TestRun_LaunchFailureIsErrorWithoutWaiting(t *testing.T) {
	r := newRig(t)
	r.launcher.failNext = errors.New("tmux の外です")
	rep := r.clarity(true)
	if rep.Verdict != review.Error || !strings.Contains(findingCodes(rep), "REV-403") || !strings.Contains(rep.Error, "tmux") {
		t.Errorf("verdict = %s codes=%s err=%q", rep.Verdict, findingCodes(rep), rep.Error)
	}
	if r.waited != 0 {
		t.Errorf("waited %s after a launch failure", r.waited)
	}
}

func TestRun_InterruptedLaunchReusesTheSameLaunchID(t *testing.T) {
	r := newRig(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	r.launcher.failNext = context.Canceled
	req := r.request(review.Clarity)
	req.Team = true
	rep := review.Run(ctx, req, r.deps)
	if rep.Verdict != review.Error || len(r.launcher.Launches()) != 0 {
		t.Fatalf("interrupted run: %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
	again := r.clarity(true)
	launches := r.launcher.Launches()
	if again.Verdict != review.Reading || len(launches) != 3 {
		t.Fatalf("retry: %s launches=%d", again.Verdict, len(launches))
	}
	if launches[0].ID != rep.Run+"-P1-a1" {
		t.Errorf("retry used %s, want the same first attempt id %s", launches[0].ID, rep.Run+"-P1-a1")
	}
}

func TestRun_EditingBodyChangesRunClosesOldLaunchesAndRereads(t *testing.T) {
	r := newRig(t)
	first := r.clarity(true)
	r.fileReplace("manuscripts/chapter01.md", "旅人が宿に着く。", "旅人が雨の夜に宿に着く。")
	second := r.clarity(true)
	if second.Run == first.Run {
		t.Fatal("run id did not change with the body")
	}
	if second.Criteria != first.Criteria {
		t.Errorf("criteria changed with the body: %s -> %s", first.Criteria, second.Criteria)
	}
	if closed := r.launcher.Closed(); len(closed) != 3 {
		t.Errorf("old launches closed = %d, want 3", len(closed))
	}
	if launches := r.launcher.Launches(); len(launches) != 6 || launches[3].ID != second.Run+"-P1-a1" {
		t.Errorf("relaunch = %d launches", len(launches))
	}
	// Without --team, an edit closes the old panel and hands over to the author.
	r.fileReplace("manuscripts/chapter01.md", "雨の夜に", "嵐の夜に")
	third := r.clarity(false)
	if third.Verdict != review.Author || !strings.Contains(findingCodes(third), "REV-304") {
		t.Errorf("edit without --team: %s %s", third.Verdict, findingCodes(third))
	}
	if len(r.launcher.Closed()) != 6 || len(r.launcher.Launches()) != 6 {
		t.Errorf("closed=%d launches=%d, want 6 and 6", len(r.launcher.Closed()), len(r.launcher.Launches()))
	}
}

func TestRun_JudgeFailureIsError(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(true)
	for _, a := range rainkeyAgents() {
		r.readAll(rep.Run, a.Agent, nil)
	}
	r.decider.err = errors.New("HTTP 500")
	final := r.clarity(false)
	if final.Verdict != review.Error || final.ExitCode() != 4 || !strings.Contains(findingCodes(final), "REV-401") {
		t.Errorf("verdict = %s exit=%d codes=%s", final.Verdict, final.ExitCode(), findingCodes(final))
	}
}

func TestRun_OfflineJudgeMissIsError(t *testing.T) {
	r := newRig(t)
	run := r.readEveryone(nil)
	r.deps.Decider = nil
	rep := r.clarity(false)
	if rep.Verdict != review.Error || !strings.Contains(findingCodes(rep), "REV-401") || rep.Run != run {
		t.Errorf("verdict = %s codes=%s", rep.Verdict, findingCodes(rep))
	}
}

func TestRun_UnknownAnswerIsEditHoldIsAuthor(t *testing.T) {
	r := newRig(t)
	r.readEveryone(map[string]string{"loc（再）": "不明"})
	for _, k := range r.cellKeys("loc", review.ReaskRef, "不明") {
		r.decider.values[k] = 0.05
	}
	rep := r.clarity(false)
	if rep.Verdict != review.Edit || !strings.Contains(findingCodes(rep), "REV-202") || rep.Cells.Unknown != 3 {
		t.Errorf("unknown: %s %s cells=%+v", rep.Verdict, findingCodes(rep), rep.Cells)
	}

	r2 := newRig(t)
	keys := r2.cellKeys("loc", review.ReaskRef, goldenAnswers(t)["loc（再）"])
	r2.decider.values[keys[0]] = 0.3
	r2.readEveryone(nil)
	hold := r2.clarity(false)
	if hold.Verdict != review.Author || hold.ExitCode() != 3 || !strings.Contains(findingCodes(hold), "REV-306") {
		t.Errorf("hold: %s exit=%d %s", hold.Verdict, hold.ExitCode(), findingCodes(hold))
	}
	if len(hold.Holds) != 3 || hold.Holds[0].Whole != 0.3 || hold.Cells.Hold != 3 || hold.Cells.Stated != 9 {
		t.Errorf("holds = %+v cells=%+v", hold.Holds, hold.Cells)
	}
}

func TestRun_CriteriaMismatchIsAuthor(t *testing.T) {
	r := newRig(t)
	base := r.clarity(true)
	check := func(name string, mutate func(*rig)) {
		t.Helper()
		rr := newRig(t)
		if rr.clarity(true).Criteria != base.Criteria {
			t.Fatalf("%s: fresh copies differ in criteria", name)
		}
		mutate(rr)
		req := rr.request(review.Clarity)
		req.Criteria = base.Criteria
		rep := rr.run(req)
		if rep.Verdict != review.Author || rep.ExitCode() != 3 {
			t.Errorf("%s: verdict = %s codes=%s", name, rep.Verdict, findingCodes(rep))
		}
	}
	check("模範解答を変える", func(rr *rig) {
		rr.fileReplace("src/propositions/loc.ts", `extra: "まだ確かめてはいない"`, `extra: "確かめていない"`)
	})
	check("名簿を変える", func(rr *rig) { rr.manifestReplace(`"model": "grok-4.7"`, `"model": "grok-5"`) })
	check("印を下げる", func(rr *rig) {
		rr.fileReplace("manuscripts/chapter01.md", "door:shown", "door:inferring")
	})
	check("保留を解く", func(rr *rig) {
		rr.readEveryone(nil)
		rep := review.Resolve(context.Background(), review.ResolveRequest{Path: rr.path, Cell: review.Cell{Agent: "P2", Fact: "loc", Ref: review.ReaskRef}, Accept: true, Why: "内容は合っている"}, rr.deps)
		if rep.Verdict != review.Done {
			t.Fatalf("resolve: %s %s", rep.Verdict, rep.Error)
		}
	})
	// The matching fingerprint passes through.
	req := r.request(review.Clarity)
	req.Criteria = base.Criteria
	if rep := r.run(req); rep.Verdict != review.Reading {
		t.Errorf("matching criteria: %s %s", rep.Verdict, findingCodes(rep))
	}
}

func TestRun_UsageErrors(t *testing.T) {
	r := newRig(t)
	cases := map[string]review.Request{
		"instruction to clarity": {Kind: review.Clarity, Path: r.path, Instruction: "x"},
		"instruction to typo":    {Kind: review.Typo, Path: r.path, Instruction: "x"},
		"consult without":        {Kind: review.Consult, Path: r.path},
		"unknown kind":           {Kind: "spell", Path: r.path},
	}
	for name, req := range cases {
		rep := r.run(req)
		if rep.Verdict != review.Usage || rep.ExitCode() != 2 {
			t.Errorf("%s: verdict = %s exit=%d", name, rep.Verdict, rep.ExitCode())
		}
	}
}

func TestRun_DryRunReportsPlanWithoutSending(t *testing.T) {
	r := newRig(t)
	req := r.request(review.Clarity)
	req.DryRun = true
	req.Team = true
	rep := r.run(req)
	if rep.Verdict != review.Done || rep.Sent == nil {
		t.Fatalf("dry run: %s %+v", rep.Verdict, rep)
	}
	if rep.Sent.Probe != 2 || rep.Sent.JudgeQueries != 30 || len(rep.Sent.Destinations) != 3 {
		t.Errorf("sent = %+v, want probe 2, judge 30, 3 destinations", rep.Sent)
	}
	if r.decider.Calls() != 0 || len(r.launcher.Launches()) != 0 {
		t.Errorf("dry run sent %d calls, launched %d", r.decider.Calls(), len(r.launcher.Launches()))
	}
	if exists(filepath.Join(r.root, ".storyteller", "review", "current-clarity.json")) {
		t.Error("dry run wrote current-clarity.json")
	}
}

func TestRun_RecordsLiveUnderProjectAndMapOutsideWorkRoot(t *testing.T) {
	r := newRig(t)
	rep := r.clarity(true)
	runDir := filepath.Join(r.root, ".storyteller", "review", "runs", rep.Run)
	for _, f := range []string{"launch.json", "P1.jsonl"} {
		if !exists(filepath.Join(runDir, f)) {
			t.Errorf("%s missing in %s", f, runDir)
		}
	}
	if !exists(filepath.Join(r.root, ".storyteller", "review", "current-clarity.json")) {
		t.Error("current-clarity.json missing")
	}
	if !exists(filepath.Join(r.deps.MapRoot, rep.Run+".json")) {
		t.Error("run map missing in MapRoot")
	}
	found := false
	filepath.WalkDir(r.deps.WorkRoot, func(path string, d os.DirEntry, _ error) error {
		if !d.IsDir() && strings.Contains(d.Name(), rep.Run) && strings.HasSuffix(d.Name(), ".json") {
			found = true
		}
		return nil
	})
	if found {
		t.Error("run map found under WorkRoot (inside a work dir or its parent)")
	}
	if strings.Contains(readFile(t, filepath.Join(r.deps.MapRoot, rep.Run+".json")), r.root) == false {
		t.Error("run map does not point at the project")
	}
}

func TestRun_RefusesWorkRootInsideProject(t *testing.T) {
	r := newRig(t)
	r.deps.WorkRoot = filepath.Join(r.root, "work")
	if rep := r.clarity(true); rep.Verdict != review.Error || len(r.launcher.Launches()) != 0 {
		t.Errorf("work root inside project: %s launches=%d", rep.Verdict, len(r.launcher.Launches()))
	}
	r2 := newRig(t)
	r2.deps.MapRoot = filepath.Join(r2.deps.WorkRoot, "maps")
	if rep := r2.clarity(true); rep.Verdict != review.Error || len(r2.launcher.Launches()) != 0 {
		t.Errorf("map root inside work root: %s launches=%d", rep.Verdict, len(r2.launcher.Launches()))
	}
}
