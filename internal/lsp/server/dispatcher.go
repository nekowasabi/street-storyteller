// Package server hosts LSP server core: dispatcher, lifecycle, and text sync.
package server

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// HandlerFunc handles a single LSP method invocation.
type HandlerFunc func(ctx context.Context, params json.RawMessage) (any, error)

// Dispatcher routes LSP method names to registered handlers.
type Dispatcher struct {
	mu       sync.RWMutex
	handlers map[string]HandlerFunc
}

// New constructs an empty Dispatcher.
func New() *Dispatcher {
	return &Dispatcher{handlers: make(map[string]HandlerFunc)}
}

// Register associates a method name with a handler. Last write wins.
func (d *Dispatcher) Register(method string, h HandlerFunc) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.handlers[method] = h
}

// Dispatch invokes the registered handler for method, or returns a
// MethodNotFound ResponseError if none is registered. Handler errors are
// propagated unchanged so callers can decide how to wrap them on the wire.
func (d *Dispatcher) Dispatch(ctx context.Context, method string, params json.RawMessage) (any, error) {
	d.mu.RLock()
	h, ok := d.handlers[method]
	d.mu.RUnlock()
	if !ok {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeMethodNotFound,
			Message: "method not found: " + method,
		}
	}
	return h(ctx, params)
}
