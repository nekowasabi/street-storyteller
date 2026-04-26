// Package server wires the MCP transport, lifecycle, and tool registry into
// a single runnable JSON-RPC server.
package server

import (
	"context"
	"encoding/json"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// Handler is the per-method callback registered with the Dispatcher.
//
// Why: returns (any, error) instead of building a Message directly — the
// dispatcher owns id-propagation and JSON-RPC envelope construction so
// individual handlers stay focused on business logic.
type Handler func(ctx context.Context, params json.RawMessage) (any, error)

// Dispatcher routes JSON-RPC method calls to registered Handlers.
type Dispatcher struct {
	handlers map[string]Handler
}

// NewDispatcher constructs an empty Dispatcher.
func NewDispatcher() *Dispatcher {
	return &Dispatcher{handlers: make(map[string]Handler)}
}

// Register installs h as the handler for method.
func (d *Dispatcher) Register(method string, h Handler) {
	d.handlers[method] = h
}

// Dispatch invokes the handler registered for msg.Method and returns the
// resulting response Message. Unknown methods produce a CodeMethodNotFound
// error response. Handler errors are surfaced as CodeInternalError responses
// with the error string.
func (d *Dispatcher) Dispatch(ctx context.Context, msg *protocol.Message) (*protocol.Message, error) {
	h, ok := d.handlers[msg.Method]
	if !ok {
		return protocol.NewErrorResponse(msg.ID, protocol.CodeMethodNotFound, "method not found: "+msg.Method), nil
	}
	result, err := h(ctx, msg.Params)
	if err != nil {
		return protocol.NewErrorResponse(msg.ID, protocol.CodeInternalError, err.Error()), nil
	}
	resp, err := protocol.NewResponse(msg.ID, result)
	if err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeIO, "dispatcher: build response")
	}
	return resp, nil
}
