package tools

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

type fakeTool struct{ name string }

func (f fakeTool) Definition() protocol.Tool {
	return protocol.Tool{Name: f.name, InputSchema: json.RawMessage(`{}`)}
}
func (f fakeTool) Handle(_ context.Context, _ json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	return &protocol.CallToolResult{Content: []protocol.ContentBlock{{Type: "text", Text: f.name}}}, nil
}

func TestRegistry_RegisterAndList(t *testing.T) {
	r := NewRegistry()
	if err := r.Register(fakeTool{name: "a"}); err != nil {
		t.Fatalf("Register a: %v", err)
	}
	if err := r.Register(fakeTool{name: "b"}); err != nil {
		t.Fatalf("Register b: %v", err)
	}
	got := r.List()
	if len(got) != 2 || got[0].Name != "a" || got[1].Name != "b" {
		t.Errorf("unexpected list: %+v", got)
	}
}

func TestRegistry_DuplicateRegisterReturnsError(t *testing.T) {
	r := NewRegistry()
	_ = r.Register(fakeTool{name: "dup"})
	if err := r.Register(fakeTool{name: "dup"}); err == nil {
		t.Fatal("expected duplicate error")
	}
}

func TestRegistry_GetReturnsRegistered(t *testing.T) {
	r := NewRegistry()
	_ = r.Register(fakeTool{name: "x"})
	tool, ok := r.Get("x")
	if !ok || tool.Definition().Name != "x" {
		t.Errorf("Get returned ok=%v def=%+v", ok, tool)
	}
	if _, ok := r.Get("missing"); ok {
		t.Error("expected miss")
	}
}
