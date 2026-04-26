// Package tools defines the MCP Tool contract and the in-memory Registry
// that the server uses to satisfy tools/list and tools/call.
package tools

import (
	"context"
	"encoding/json"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// ExecutionContext supplies cross-cutting state to a tool's Handle method.
//
// Why: a small struct rather than func parameters — additional fields (e.g.
// project store, logger) will be added without breaking every Tool signature.
type ExecutionContext struct {
	ProjectRoot string
}

// Tool is the unit registered against a server. Implementations describe
// themselves via Definition() and execute via Handle().
type Tool interface {
	Definition() protocol.Tool
	Handle(ctx context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error)
}

// Registry holds the set of Tools available to a server instance.
type Registry interface {
	Register(t Tool) error
	List() []protocol.Tool
	Get(name string) (Tool, bool)
}

type registry struct {
	tools map[string]Tool
	order []string
}

// NewRegistry constructs an empty Registry.
func NewRegistry() Registry {
	return &registry{tools: make(map[string]Tool)}
}

// Register installs t. Duplicate names yield an EntityConflict error.
//
// Why insertion-order tracked separately: callers (and snapshots in tests)
// expect tools/list output to be deterministic. Go map iteration is not.
func (r *registry) Register(t Tool) error {
	def := t.Definition()
	if _, dup := r.tools[def.Name]; dup {
		return apperrors.New(apperrors.CodeEntityConflict, "tool already registered: "+def.Name)
	}
	r.tools[def.Name] = t
	r.order = append(r.order, def.Name)
	return nil
}

// List returns each registered Tool's Definition in insertion order.
func (r *registry) List() []protocol.Tool {
	out := make([]protocol.Tool, 0, len(r.order))
	for _, n := range r.order {
		out = append(out, r.tools[n].Definition())
	}
	return out
}

// Get returns the Tool registered under name and whether it was found.
func (r *registry) Get(name string) (Tool, bool) {
	t, ok := r.tools[name]
	return t, ok
}
