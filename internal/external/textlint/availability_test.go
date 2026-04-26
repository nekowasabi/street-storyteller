package textlint_test

import (
	"context"
	"testing"

	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

func TestIsAvailable_OK(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: []byte("v14.0.0\n"), ExitCode: 0})
	ok, reason := textlint.IsAvailable(context.Background(), r)
	if !ok {
		t.Errorf("IsAvailable = false, reason=%q; want true", reason)
	}
	if reason != "" {
		t.Errorf("reason = %q, want empty", reason)
	}
}

func TestIsAvailable_NotInstalled(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{ExitCode: 127})
	ok, reason := textlint.IsAvailable(context.Background(), r)
	if ok {
		t.Error("IsAvailable = true, want false")
	}
	if reason == "" {
		t.Error("reason is empty, want non-empty")
	}
}

func TestIsAvailable_RunError(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{ExitCode: 1, Err: context.DeadlineExceeded})
	ok, reason := textlint.IsAvailable(context.Background(), r)
	if ok {
		t.Error("IsAvailable = true, want false on error")
	}
	if reason == "" {
		t.Error("reason is empty, want non-empty")
	}
}
