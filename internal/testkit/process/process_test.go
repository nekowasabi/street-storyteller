package process_test

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"github.com/takets/street-storyteller/internal/testkit/process"
)

func TestFakeRunner_PlanReturnsResponsesInOrder(t *testing.T) {
	t.Parallel()

	runner := process.NewFakeRunner()
	runner.Plan(process.FakeResponse{Stdout: []byte("first"), ExitCode: 0})
	runner.Plan(process.FakeResponse{Stdout: []byte("second"), ExitCode: 1})

	ctx := context.Background()

	res1, err := runner.Run(ctx, "textlint", []string{"--format", "json"}, strings.NewReader("input-1"))
	if err != nil {
		t.Fatalf("first Run returned error: %v", err)
	}
	if got, want := string(res1.Stdout), "first"; got != want {
		t.Errorf("res1.Stdout = %q, want %q", got, want)
	}
	if res1.ExitCode != 0 {
		t.Errorf("res1.ExitCode = %d, want 0", res1.ExitCode)
	}

	res2, err := runner.Run(ctx, "deno", []string{"task", "test"}, strings.NewReader("input-2"))
	if err != nil {
		t.Fatalf("second Run returned error: %v", err)
	}
	if got, want := string(res2.Stdout), "second"; got != want {
		t.Errorf("res2.Stdout = %q, want %q", got, want)
	}
	if res2.ExitCode != 1 {
		t.Errorf("res2.ExitCode = %d, want 1", res2.ExitCode)
	}
}

func TestFakeRunner_CallsHistoryCapturesNameArgsStdin(t *testing.T) {
	t.Parallel()

	runner := process.NewFakeRunner()
	runner.Plan(process.FakeResponse{})
	runner.Plan(process.FakeResponse{})

	ctx := context.Background()
	if _, err := runner.Run(ctx, "textlint", []string{"--fix"}, strings.NewReader("body-1")); err != nil {
		t.Fatalf("Run #1: %v", err)
	}
	if _, err := runner.Run(ctx, "deno", []string{"check"}, nil); err != nil {
		t.Fatalf("Run #2: %v", err)
	}

	calls := runner.Calls()
	if len(calls) != 2 {
		t.Fatalf("Calls() length = %d, want 2", len(calls))
	}

	if calls[0].Name != "textlint" {
		t.Errorf("calls[0].Name = %q, want %q", calls[0].Name, "textlint")
	}
	if want := []string{"--fix"}; !equalSlice(calls[0].Args, want) {
		t.Errorf("calls[0].Args = %v, want %v", calls[0].Args, want)
	}
	if got, want := string(calls[0].Stdin), "body-1"; got != want {
		t.Errorf("calls[0].Stdin = %q, want %q", got, want)
	}

	if calls[1].Name != "deno" {
		t.Errorf("calls[1].Name = %q, want %q", calls[1].Name, "deno")
	}
	if want := []string{"check"}; !equalSlice(calls[1].Args, want) {
		t.Errorf("calls[1].Args = %v, want %v", calls[1].Args, want)
	}
	if len(calls[1].Stdin) != 0 {
		t.Errorf("calls[1].Stdin = %q, want empty", string(calls[1].Stdin))
	}
}

func TestFakeRunner_ExhaustedQueueReturnsError(t *testing.T) {
	t.Parallel()

	runner := process.NewFakeRunner()
	runner.Plan(process.FakeResponse{Stdout: []byte("only")})

	ctx := context.Background()
	if _, err := runner.Run(ctx, "textlint", nil, nil); err != nil {
		t.Fatalf("first Run returned error: %v", err)
	}

	_, err := runner.Run(ctx, "textlint", nil, nil)
	if err == nil {
		t.Fatal("second Run on exhausted queue: expected error, got nil")
	}
}

func TestFakeRunner_PlannedErrorIsReturned(t *testing.T) {
	t.Parallel()

	sentinel := errors.New("planned failure")
	runner := process.NewFakeRunner()
	runner.Plan(process.FakeResponse{Err: sentinel, Stderr: []byte("boom")})

	ctx := context.Background()
	res, err := runner.Run(ctx, "textlint", nil, nil)
	if !errors.Is(err, sentinel) {
		t.Fatalf("Run error = %v, want sentinel %v", err, sentinel)
	}
	if res == nil {
		t.Fatal("Run returned nil Result; expected stderr to be propagated even on error")
	}
	if got, want := string(res.Stderr), "boom"; got != want {
		t.Errorf("res.Stderr = %q, want %q", got, want)
	}
}

func TestFakeRunner_ConcurrentCallsAreRaceFree(t *testing.T) {
	t.Parallel()

	runner := process.NewFakeRunner()
	const n = 16
	for i := 0; i < n; i++ {
		runner.Plan(process.FakeResponse{Stdout: []byte("ok")})
	}

	ctx := context.Background()
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = runner.Run(ctx, "textlint", nil, nil)
		}()
	}
	wg.Wait()

	if got := len(runner.Calls()); got != n {
		t.Errorf("Calls() length = %d, want %d", got, n)
	}
}

func equalSlice(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
