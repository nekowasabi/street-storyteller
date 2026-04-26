package server

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

func TestDispatcher_RegisteredMethodInvokesHandler(t *testing.T) {
	d := NewDispatcher()
	d.Register("ping", func(_ context.Context, _ json.RawMessage) (any, error) {
		return map[string]string{"reply": "pong"}, nil
	})
	resp, err := d.Dispatch(context.Background(), &protocol.Message{
		JSONRPC: "2.0",
		ID:      json.RawMessage(`1`),
		Method:  "ping",
	})
	if err != nil {
		t.Fatalf("Dispatch: %v", err)
	}
	if resp.Error != nil {
		t.Fatalf("unexpected error response: %+v", resp.Error)
	}
	if string(resp.Result) != `{"reply":"pong"}` {
		t.Errorf("result = %s", string(resp.Result))
	}
}

func TestDispatcher_UnknownMethodReturnsError(t *testing.T) {
	d := NewDispatcher()
	resp, err := d.Dispatch(context.Background(), &protocol.Message{
		Method: "nope",
		ID:     json.RawMessage(`2`),
	})
	if err != nil {
		t.Fatalf("Dispatch: %v", err)
	}
	if resp.Error == nil || resp.Error.Code != protocol.CodeMethodNotFound {
		t.Errorf("expected MethodNotFound, got %+v", resp.Error)
	}
}

func TestDispatcher_HandlerErrorBecomesResponseError(t *testing.T) {
	d := NewDispatcher()
	d.Register("boom", func(_ context.Context, _ json.RawMessage) (any, error) {
		return nil, errors.New("kapow")
	})
	resp, err := d.Dispatch(context.Background(), &protocol.Message{
		Method: "boom",
		ID:     json.RawMessage(`3`),
	})
	if err != nil {
		t.Fatalf("Dispatch: %v", err)
	}
	if resp.Error == nil || resp.Error.Code != protocol.CodeInternalError {
		t.Errorf("expected InternalError, got %+v", resp.Error)
	}
}
