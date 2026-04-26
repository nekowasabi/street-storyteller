package server

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

func TestDispatcher_RegisterAndDispatch(t *testing.T) {
	d := New()
	d.Register("ping", func(ctx context.Context, params json.RawMessage) (any, error) {
		return "pong", nil
	})

	got, err := d.Dispatch(context.Background(), "ping", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "pong" {
		t.Fatalf("got %v, want pong", got)
	}
}

func TestDispatcher_UnknownMethod_ReturnsMethodNotFound(t *testing.T) {
	d := New()
	_, err := d.Dispatch(context.Background(), "nope", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	var rerr *protocol.ResponseError
	if !errors.As(err, &rerr) {
		t.Fatalf("expected *protocol.ResponseError, got %T", err)
	}
	if rerr.Code != protocol.CodeMethodNotFound {
		t.Fatalf("got code %d, want %d", rerr.Code, protocol.CodeMethodNotFound)
	}
}

func TestDispatcher_HandlerError_PropagatedAsResponseError(t *testing.T) {
	d := New()
	want := &protocol.ResponseError{Code: protocol.CodeInternalError, Message: "boom"}
	d.Register("explode", func(ctx context.Context, params json.RawMessage) (any, error) {
		return nil, want
	})

	_, err := d.Dispatch(context.Background(), "explode", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	var rerr *protocol.ResponseError
	if !errors.As(err, &rerr) {
		t.Fatalf("expected *protocol.ResponseError, got %T", err)
	}
	if rerr != want {
		t.Fatalf("got %+v, want same pointer %+v", rerr, want)
	}
}
