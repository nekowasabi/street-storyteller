package server

import (
	"bytes"
	"context"
	"testing"
)

func TestRunStopsAtExitNotification(t *testing.T) {
	var in, out bytes.Buffer
	for _, body := range []string{
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`,
		`{"jsonrpc":"2.0","id":2,"method":"shutdown"}`,
		`{"jsonrpc":"2.0","method":"exit"}`,
		`{"jsonrpc":"2.0","id":3,"method":"must-not-be-dispatched"}`,
	} {
		in.Write(frameBody([]byte(body)))
	}
	srv := NewServer(ServerOptions{})
	srv.RegisterStandardHandlers()
	if err := srv.Run(context.Background(), &in, &out); err != nil {
		t.Fatalf("clean shutdown returned error: %v", err)
	}
	messages := readAllResponses(t, &out)
	if len(messages) != 2 {
		t.Fatalf("expected only initialize and shutdown responses, got %d", len(messages))
	}
	if string(messages[1].Result) != "null" {
		t.Errorf("shutdown result = %s, want null", messages[1].Result)
	}
}

func TestRunReportsExitWithoutShutdown(t *testing.T) {
	in := bytes.NewBuffer(frameBody([]byte(`{"jsonrpc":"2.0","method":"exit"}`)))
	var out bytes.Buffer
	srv := NewServer(ServerOptions{})
	srv.RegisterStandardHandlers()
	if err := srv.Run(context.Background(), in, &out); err == nil {
		t.Fatal("exit without shutdown should return an error to the CLI")
	}
	if out.Len() != 0 {
		t.Fatalf("exit notification received a response: %s", out.String())
	}
}
