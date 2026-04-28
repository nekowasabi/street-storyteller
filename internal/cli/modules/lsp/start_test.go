package lsp

import (
	"bytes"
	"context"
	"io"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
)

func TestStartStdio_DoesNotExitAfterTwoSeconds(t *testing.T) {
	cmd := NewStart()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	reader, writer := io.Pipe()
	defer writer.Close()
	var out, errBuf bytes.Buffer
	done := make(chan int, 1)
	go func() {
		done <- cmd.Handle(cli.CommandContext{
			Ctx:       ctx,
			Args:      []string{"--stdio"},
			Presenter: cli.NewTextPresenter(&out, &errBuf),
			Deps: cli.Deps{
				Stdin:  reader,
				Stdout: &out,
				Stderr: &errBuf,
			},
		})
	}()

	select {
	case code := <-done:
		t.Fatalf("Handle returned early with code %d; stderr=%q", code, errBuf.String())
	case <-time.After(2100 * time.Millisecond):
	}

	cancel()
	_ = reader.Close()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Handle did not return after context cancellation")
	}
}

func TestResolveRootURI(t *testing.T) {
	got, err := resolveRootURI(".")
	if err != nil {
		t.Fatalf("resolveRootURI: %v", err)
	}
	if got == "" || got[:7] != "file://" {
		t.Fatalf("root URI = %q, want file URI", got)
	}
}
