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
