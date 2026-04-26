package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestSubplotCreateTool_Definition(t *testing.T) {
	def := SubplotCreateTool{}.Definition()
	if def.Name != "subplot_create" {
		t.Errorf("name = %q, want subplot_create", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestSubplotCreateTool_Handle_Success(t *testing.T) {
	args := json.RawMessage(`{"name":"Main Plot","type":"main","summary":"The hero's journey"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "subplot created: main_plot") {
		t.Errorf("expected 'subplot created: main_plot' in %q", text)
	}
	if !strings.Contains(text, `"main"`) {
		t.Errorf("expected type 'main' in JSON output: %q", text)
	}
}

func TestSubplotCreateTool_Handle_MissingName(t *testing.T) {
	args := json.RawMessage(`{"type":"subplot","summary":"A side story"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError when name is missing")
	}
	if !strings.Contains(res.Content[0].Text, "name is required") {
		t.Errorf("unexpected message: %q", res.Content[0].Text)
	}
}

func TestSubplotCreateTool_Handle_MissingType(t *testing.T) {
	args := json.RawMessage(`{"name":"Love Story","summary":"A romance arc"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError when type is missing")
	}
	if !strings.Contains(res.Content[0].Text, "type is required") {
		t.Errorf("unexpected message: %q", res.Content[0].Text)
	}
}

func TestSubplotCreateTool_Handle_MissingSummary(t *testing.T) {
	args := json.RawMessage(`{"name":"Revenge Plot","type":"subplot"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError when summary is missing")
	}
	if !strings.Contains(res.Content[0].Text, "summary is required") {
		t.Errorf("unexpected message: %q", res.Content[0].Text)
	}
}

func TestSubplotCreateTool_Handle_InvalidType(t *testing.T) {
	args := json.RawMessage(`{"name":"Mystery Arc","type":"unknown","summary":"A mystery"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for invalid type")
	}
	if !strings.Contains(res.Content[0].Text, "invalid type") {
		t.Errorf("unexpected message: %q", res.Content[0].Text)
	}
}

func TestSubplotCreateTool_Handle_ExplicitID(t *testing.T) {
	args := json.RawMessage(`{"name":"Love Story","type":"subplot","summary":"Romance arc","id":"custom_id"}`)
	res, err := SubplotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	if !strings.Contains(res.Content[0].Text, "subplot created: custom_id") {
		t.Errorf("expected explicit id in output: %q", res.Content[0].Text)
	}
}
