package ateam_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/external/ateam"
	"github.com/takets/street-storyteller/internal/service/review"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

// R15: ateam dispatch/close argv and output parsing. testdata/*.out are the
// real outputs measured on 2026-11-15.

func fixture(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	return b
}

var agent = review.AgentLaunch{Agent: "P1", Runtime: "claude-code", Model: "claude-fable-5-1", Effort: "medium", Prompt: review.LaunchPrompt}

func TestAteam_DispatchArgvAndRunID(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: fixture(t, "dispatch.out")})
	l := ateam.New("/opt/ateam/ateam.sh", r)
	h, err := l.Launch(context.Background(), "r-5be01c9a-P1-a1", "/tmp/storyteller-review/r-5be01c9a-P1", agent)
	if err != nil {
		t.Fatal(err)
	}
	if h.RunID != "1010633ecc0a" || h.ID != "r-5be01c9a-P1-a1" {
		t.Errorf("handle = %+v", h)
	}
	calls := r.Calls()
	if len(calls) != 1 || calls[0].Name != "/opt/ateam/ateam.sh" {
		t.Fatalf("calls = %+v", calls)
	}
	args := calls[0].Args
	wantPrefix := []string{"dispatch", "r-5be01c9a-P1-a1", "--project", "/tmp/storyteller-review/r-5be01c9a-P1", "--task", "storyteller review", "--assignments"}
	if len(args) != len(wantPrefix)+1 || !reflect.DeepEqual(args[:len(wantPrefix)], wantPrefix) {
		t.Fatalf("args = %q\nwant prefix %q", args, wantPrefix)
	}
	var assignments []map[string]string
	if err := json.Unmarshal([]byte(args[len(args)-1]), &assignments); err != nil {
		t.Fatalf("assignments not JSON: %v (%s)", err, args[len(args)-1])
	}
	want := []map[string]string{{"role": "P1", "runtime": "claude-code", "model": "claude-fable-5-1", "effort": "medium", "brief": review.LaunchPrompt}}
	if !reflect.DeepEqual(assignments, want) {
		t.Errorf("assignments = %v, want %v", assignments, want)
	}
	if calls[0].Stdin != nil && len(calls[0].Stdin) != 0 {
		t.Errorf("stdin sent: %q", calls[0].Stdin)
	}
}

func TestAteam_OutputWithoutRunIDIsSuccessWithoutHandle(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: []byte("status=already-dispatched name=claude-1010633ecc0a team=dispatch\n")})
	h, err := ateam.New("ateam.sh", r).Launch(context.Background(), "r-5be01c9a-P1-a1", "/tmp/w", agent)
	if err != nil {
		t.Fatalf("resend treated as failure: %v", err)
	}
	if h.RunID != "" {
		t.Errorf("RunID = %q, want empty", h.RunID)
	}
}

func TestAteam_NonZeroExitIsFailure(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: fixture(t, "dispatch.out"), Stderr: []byte("tmux not running"), ExitCode: 1})
	if _, err := ateam.New("ateam.sh", r).Launch(context.Background(), "id", "/tmp/w", agent); err == nil || !strings.Contains(err.Error(), "tmux") {
		t.Errorf("err = %v", err)
	}
	r2 := process.NewFakeRunner()
	r2.Plan(process.FakeResponse{Err: os.ErrNotExist})
	if _, err := ateam.New("ateam.sh", r2).Launch(context.Background(), "id", "/tmp/w", agent); err == nil {
		t.Error("runner error accepted")
	}
}

func TestAteam_CloseArgvAndSkipWithoutRunID(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: fixture(t, "close.out")})
	l := ateam.New("ateam.sh", r)
	if err := l.Close(context.Background(), review.LaunchHandle{ID: "x", RunID: "1010633ecc0a"}); err != nil {
		t.Fatal(err)
	}
	calls := r.Calls()
	if len(calls) != 1 || !reflect.DeepEqual(calls[0].Args, []string{"close", "1010633ecc0a"}) {
		t.Errorf("close argv = %+v", calls)
	}
	if err := l.Close(context.Background(), review.LaunchHandle{ID: "x"}); err != nil || len(r.Calls()) != 1 {
		t.Errorf("close without run_id: err=%v calls=%d", err, len(r.Calls()))
	}
	r2 := process.NewFakeRunner()
	r2.Plan(process.FakeResponse{ExitCode: 3})
	if err := ateam.New("ateam.sh", r2).Close(context.Background(), review.LaunchHandle{RunID: "1010633ecc0a"}); err == nil {
		t.Error("close exit 3 accepted")
	}
}

func TestAteam_TildeExpandsToHome(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: fixture(t, "dispatch.out")})
	if _, err := ateam.New("~/.agents/skills/ateam/scripts/ateam.sh", r).Launch(context.Background(), "id", "/tmp/w", agent); err != nil {
		t.Fatal(err)
	}
	if got := r.Calls()[0].Name; got != filepath.Join(home, ".agents", "skills", "ateam", "scripts", "ateam.sh") {
		t.Errorf("command = %s", got)
	}
}

func TestAteam_EmptyPathIsFailure(t *testing.T) {
	r := process.NewFakeRunner()
	if _, err := ateam.New("", r).Launch(context.Background(), "id", "/tmp/w", agent); err == nil || len(r.Calls()) != 0 {
		t.Errorf("err=%v calls=%d", err, len(r.Calls()))
	}
}
