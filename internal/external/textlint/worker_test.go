package textlint

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/testkit/clock"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

func TestRealWorker_Lint_Success(t *testing.T) {
	body, err := os.ReadFile(filepath.Join("testdata", "textlint", "single_file.json"))
	if err != nil {
		t.Fatalf("fixture: %v", err)
	}
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Stdout: body, ExitCode: 1})
	w := NewRealWorker(r, clock.RealClock{})
	msgs, err := w.Lint(context.Background(), "/tmp/sample.md", []byte("こんにちは"))
	if err != nil {
		t.Fatalf("Lint: %v", err)
	}
	if len(msgs) != 2 {
		t.Errorf("len = %d, want 2", len(msgs))
	}
}

func TestRealWorker_Lint_NotInstalled_ReturnsEmpty(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{ExitCode: 127})
	w := NewRealWorker(r, clock.RealClock{})
	msgs, err := w.Lint(context.Background(), "/tmp/x.md", []byte("text"))
	if err != nil {
		t.Fatalf("Lint: %v", err)
	}
	if msgs != nil {
		t.Errorf("expected nil msgs, got %+v", msgs)
	}
}

func TestRealWorker_Lint_TimeoutError(t *testing.T) {
	r := process.NewFakeRunner()
	r.Plan(process.FakeResponse{Err: context.DeadlineExceeded})
	w := NewRealWorker(r, clock.RealClock{})
	if _, err := w.Lint(context.Background(), "/tmp/x.md", []byte("text")); err == nil {
		t.Fatal("expected error")
	}
}
