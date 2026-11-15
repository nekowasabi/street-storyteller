package review_test

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/service/review"
)

// R8: review turn.

func TestTurn_PlacesNextFileOnlyAfterAcceptingTheReply(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	dir := r.workDir(run, "P1")
	if exists(filepath.Join(dir, "ask-01.md")) || exists(filepath.Join(dir, "chapter02.md")) {
		t.Fatal("later steps present before any turn")
	}
	reply := r.turn(run, "P1", 1, "旅人が宿に着いた (1:1)", "")
	if reply.Error != "" || reply.Step != 2 || reply.Of != 7 || reply.File != "ask-01.md" || reply.Done {
		t.Fatalf("reply = %+v", reply)
	}
	if !exists(filepath.Join(dir, "ask-01.md")) || exists(filepath.Join(dir, "chapter02.md")) {
		t.Error("ask-01.md should be the only new file")
	}
	if len(reply.Asks) != 1 || reply.Asks[0] != "door" {
		t.Errorf("asks = %v, want [door]", reply.Asks)
	}
	ask := readFile(t, filepath.Join(dir, "ask-01.md"))
	if !strings.HasPrefix(ask, "# 1章を読み終えたあとの問い\n") || !strings.Contains(ask, "door. 宿の裏口は、夜のあいだどうなっているか。") {
		t.Errorf("ask-01.md = %q", ask)
	}
	// Other agents are untouched.
	if exists(filepath.Join(r.workDir(run, "P2"), "ask-01.md")) {
		t.Error("P1's turn placed a file for P2")
	}
}

func TestTurn_SevenStepsEndInDoneWithReaskFile(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	var files []string
	reply := r.turn(run, "P1", 1, "n", "")
	files = append(files, "chapter01.md", reply.File)
	a := goldenAnswers(t)
	reply = r.turn(run, "P1", 2, "", "door. "+a["door"]+"\n")
	files = append(files, reply.File)
	reply = r.turn(run, "P1", 3, "n", "")
	files = append(files, reply.File)
	// The reply describes the next step: ask-02.md asks about loc.
	if len(reply.Asks) != 1 || reply.Asks[0] != "loc" {
		t.Errorf("asks after chapter 2 = %v, want [loc]", reply.Asks)
	}
	reply = r.turn(run, "P1", 4, "", "loc. "+a["loc"]+"\n")
	files = append(files, reply.File)
	reply = r.turn(run, "P1", 5, "n", "")
	files = append(files, reply.File)
	reply = r.turn(run, "P1", 6, "n", "")
	files = append(files, reply.File)
	if strings.Join(files, " ") != "chapter01.md ask-01.md chapter02.md ask-02.md chapter03.md chapter04.md ask-final.md" {
		t.Fatalf("files = %v", files)
	}
	if len(reply.Asks) != 2 || reply.Asks[0] != "door" || reply.Asks[1] != "loc" {
		t.Errorf("final asks = %v", reply.Asks)
	}
	final := readFile(t, r.workDir(run, "P1")+"/ask-final.md")
	if !strings.Contains(final, "door（再）. 宿の裏口は、夜のあいだどうなっているか。") || !strings.Contains(final, "loc（再）. （2章を読み終えた時点で）旅人は、鍵がどこにあると考えているか。") {
		t.Errorf("ask-final.md = %q", final)
	}
	reply = r.turn(run, "P1", 7, "", "door（再）. "+a["door（再）"]+"\nloc（再）. "+a["loc（再）"]+"\n")
	if reply.Error != "" || !reply.Done || reply.Step != 7 || reply.Of != 7 {
		t.Errorf("last reply = %+v", reply)
	}
}

func TestTurn_CopyHasNoFrontmatterOrMarkersAndSameLineCount(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	r.turn(run, "P1", 1, "n", "")
	r.turn(run, "P1", 2, "", "door. x\n")
	for _, name := range []string{"chapter01.md", "chapter02.md"} {
		src := readFile(t, filepath.Join(r.path, name))
		cp := readFile(t, filepath.Join(r.workDir(run, "P1"), name))
		if strings.Contains(cp, "shows:") || strings.Contains(cp, "---") || strings.Contains(cp, "chapter_id") {
			t.Errorf("%s copy leaks frontmatter or markers:\n%s", name, cp)
		}
		if strings.Count(cp, "\n") != strings.Count(src, "\n") {
			t.Errorf("%s: %d lines, want %d", name, strings.Count(cp, "\n"), strings.Count(src, "\n"))
		}
		// Body lines (after the closing --- and not markers) keep their position and bytes.
		srcLines, cpLines := strings.Split(src, "\n"), strings.Split(cp, "\n")
		closing := 0
		for i := 1; i < len(srcLines); i++ {
			if srcLines[i] == "---" {
				closing = i
				break
			}
		}
		for i := closing + 1; i < len(srcLines); i++ {
			if strings.HasPrefix(srcLines[i], "<!--") {
				continue
			}
			if cpLines[i] != srcLines[i] {
				t.Errorf("%s line %d: %q became %q", name, i+1, srcLines[i], cpLines[i])
			}
		}
	}
}

func TestTurn_RejectsSkippedAndOutOfRangeSteps(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	if reply := r.turn(run, "P1", 2, "", "door. x\n"); reply.Error == "" || reply.Code != 1 {
		t.Errorf("skip ahead accepted: %+v", reply)
	}
	if exists(filepath.Join(r.workDir(run, "P1"), "ask-01.md")) || exists(filepath.Join(r.workDir(run, "P1"), "chapter02.md")) {
		t.Error("skip ahead placed a file")
	}
	if reply := r.turn(run, "P1", 0, "n", ""); reply.Error == "" || reply.Code != 1 {
		t.Errorf("step 0 accepted: %+v", reply)
	}
	if reply := r.turn(run, "P1", 8, "n", ""); reply.Error == "" || reply.Code != 1 {
		t.Errorf("step 8 accepted: %+v", reply)
	}
}

func TestTurn_ResendOfDoneStepReturnsSameReplyWithoutNewRecord(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	first := r.turn(run, "P1", 1, "最初の記録", "")
	transcript := filepath.Join(r.root, ".storyteller", "review", "runs", run, "P1.jsonl")
	before := readFile(t, transcript)
	again := r.turn(run, "P1", 1, "書き直した記録", "")
	if !reflect.DeepEqual(again, first) {
		t.Errorf("replay = %+v, want %+v", again, first)
	}
	if after := readFile(t, transcript); after != before {
		t.Errorf("replay changed the record:\n%s\n%s", before, after)
	}
	if strings.Contains(before, "書き直した") {
		t.Error("replay overwrote the note")
	}
}

func TestTurn_RejectsEmptyNotesAndMissingAnswerIDs(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	if reply := r.turn(run, "P1", 1, "  \n", ""); reply.Error == "" || reply.Code != 1 {
		t.Errorf("empty notes accepted: %+v", reply)
	}
	r.turn(run, "P1", 1, "n", "")
	if reply := r.turn(run, "P1", 2, "", "- 答えだけで id が無い\n"); reply.Error == "" || reply.Code != 1 || !strings.Contains(reply.Error, "door") {
		t.Errorf("missing id accepted or not named: %+v", reply)
	}
	if exists(filepath.Join(r.workDir(run, "P1"), "chapter02.md")) {
		t.Error("rejected answer placed the next file")
	}
	// Chapter steps take notes, ask steps take answers.
	if reply := r.turn(run, "P1", 2, "記録を間違えて送った", ""); reply.Error == "" || reply.Code != 1 {
		t.Errorf("notes for an ask step accepted: %+v", reply)
	}
}

func TestTurn_ParsesAnswersLikePrayground(t *testing.T) {
	got := review.ParseAnswers("- door. 答えA (1:9)\n| loc： 答えB\n　loc. 二度目\n* S9．答えC\nmemo: not an id line? yes it is\n", false)
	want := map[string]string{"door": "答えA (1:9)", "loc": "答えB", "S9": "答えC", "memo": "not an id line? yes it is"}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s = %q, want %q", k, got[k], v)
		}
	}
	reask := review.ParseAnswers("door. 一回目\ndoor（再）. 再問の答え\nloc. 再なし\n", true)
	if reask["door"] != "再問の答え" || reask["loc"] != "再なし" {
		t.Errorf("reask = %v", reask)
	}
	plain := review.ParseAnswers("door. 一回目\ndoor（再）. 再問の答え\n", false)
	if plain["door"] != "一回目" {
		t.Errorf("non-reask step must ignore （再）: %v", plain)
	}
}

func TestTurn_RejectsWrongRunAndUnknownAgent(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	if reply := r.turn("r-00000000", "P1", 1, "n", ""); reply.Error == "" || reply.Code != 4 {
		t.Errorf("unknown run accepted: %+v", reply)
	}
	if reply := r.turn(run, "P9", 1, "n", ""); reply.Error == "" || reply.Code != 4 {
		t.Errorf("unknown agent accepted: %+v", reply)
	}
	// Editing the body makes the old run stale.
	r.fileReplace("manuscripts/chapter04.md", "鍵は旅人の荷物にあった。", "鍵は旅人の荷物の底にあった。")
	if reply := r.turn(run, "P1", 1, "n", ""); reply.Error == "" || reply.Code != 4 {
		t.Errorf("stale run accepted: %+v", reply)
	}
}

func TestTurn_RefusesToPlaceFilesWhenProbeNoLongerPasses(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	cache := filepath.Join(r.root, ".storyteller", "review", "judge-cache.jsonl")
	var lines []string
	for _, k := range r.probeKeys() {
		lines = append(lines, `{"key":"`+k+`","value":0.05}`)
	}
	writeFile(t, cache, readFile(t, cache)+strings.Join(lines, "\n")+"\n")
	reply := r.turn(run, "P1", 1, "n", "")
	if reply.Error == "" || reply.Code != 4 {
		t.Errorf("turn accepted after the probe fell below threshold: %+v", reply)
	}
	if exists(filepath.Join(r.workDir(run, "P1"), "ask-01.md")) {
		t.Error("file placed although probe fails")
	}
	// With the cache gone (offline miss) Turn must not place files either.
	if err := os.Remove(cache); err != nil {
		t.Fatal(err)
	}
	if reply := r.turn(run, "P1", 1, "n", ""); reply.Error == "" || reply.Code != 4 {
		t.Errorf("turn accepted without probe values: %+v", reply)
	}
}

func TestTurn_WorkDirsAreSeparatePerAgentAndMapIsNotNearThem(t *testing.T) {
	r := newRig(t)
	run := r.clarity(true).Run
	dirs := map[string]bool{}
	for _, a := range rainkeyAgents() {
		d := r.workDir(run, a.Agent)
		if dirs[d] {
			t.Errorf("duplicate work dir %s", d)
		}
		dirs[d] = true
		if exists(filepath.Join(d, run+".json")) || exists(filepath.Join(filepath.Dir(d), run+".json")) {
			t.Errorf("run map next to %s", d)
		}
	}
	r.turn(run, "P2", 1, "n", "")
	if exists(filepath.Join(r.workDir(run, "P1"), "ask-01.md")) || !exists(filepath.Join(r.workDir(run, "P2"), "ask-01.md")) {
		t.Error("P2's progress leaked into P1's directory")
	}
}
