package server

import (
	"context"
	"io"
	"testing"
	"time"
)

func TestServer_CancelReleasesInput(t *testing.T) {
	pr, pw := io.Pipe()
	ctx, cancel := context.WithCancel(context.Background())
	s := New(ServerOptions{Name: "test-server", Version: "0.0.1"})
	s.RegisterStandardHandlers()

	done := make(chan error, 1)
	go func() { done <- s.Run(ctx, pr, io.Discard) }()
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Run did not return after cancel")
	}

	if _, err := pw.Write([]byte(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}` + "\n")); err != io.ErrClosedPipe {
		t.Fatalf("input still consumed after Run returned: err=%v", err)
	}
}

type failWriter struct{}

func (failWriter) Write([]byte) (int, error) { return 0, io.ErrClosedPipe }

func TestServer_WriteFailureReleasesInput(t *testing.T) {
	pr, pw := io.Pipe()
	s := New(ServerOptions{Name: "test-server", Version: "0.0.1"})
	s.RegisterStandardHandlers()

	done := make(chan error, 1)
	go func() { done <- s.Run(context.Background(), pr, failWriter{}) }()
	if _, err := pw.Write([]byte(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}` + "\n")); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("Run returned nil after write failure")
		}
	case <-time.After(time.Second):
		t.Fatal("Run did not return after write failure")
	}

	if _, err := pw.Write([]byte(`{"jsonrpc":"2.0","id":2,"method":"tools/list"}` + "\n")); err != io.ErrClosedPipe {
		t.Fatalf("input still consumed after Run returned: err=%v", err)
	}
}
