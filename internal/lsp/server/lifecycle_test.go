package server

import (
	"errors"
	"testing"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

func TestLifecycle_InitialIsUninitialized(t *testing.T) {
	l := NewLifecycle()
	err := l.RequireInitialized()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	var rerr *protocol.ResponseError
	if !errors.As(err, &rerr) {
		t.Fatalf("expected *protocol.ResponseError, got %T", err)
	}
	if rerr.Code != protocol.CodeServerNotInitialized {
		t.Fatalf("got code %d, want %d", rerr.Code, protocol.CodeServerNotInitialized)
	}
}

func TestLifecycle_RequireInitialized_BeforeInit_Errors(t *testing.T) {
	l := NewLifecycle()
	err := l.RequireInitialized()
	var rerr *protocol.ResponseError
	if !errors.As(err, &rerr) {
		t.Fatalf("expected *protocol.ResponseError, got %T", err)
	}
	if rerr.Code != protocol.CodeServerNotInitialized {
		t.Fatalf("got code %d, want %d", rerr.Code, protocol.CodeServerNotInitialized)
	}
}

func TestLifecycle_TransitionsAreOrdered(t *testing.T) {
	l := NewLifecycle()
	l.MarkInitialized()
	if err := l.RequireInitialized(); err != nil {
		t.Fatalf("expected nil after init, got %v", err)
	}
	l.MarkShutdown()
	if !l.IsShutdown() {
		t.Fatal("expected IsShutdown true")
	}
	if err := l.RequireInitialized(); err == nil {
		t.Fatal("expected error after shutdown, got nil")
	}
}
