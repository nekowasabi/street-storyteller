package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestElementCreateTool_Definition(t *testing.T) {
	def := ElementCreateTool{}.Definition()
	if def.Name != "element_create" {
		t.Errorf("name = %q", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestElementCreateTool_Handle_MissingKind(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"name":"hero","summary":"brave hero"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing kind")
	}
}

func TestElementCreateTool_Handle_MissingName(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"character","summary":"brave hero"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing name")
	}
}

func TestElementCreateTool_Handle_MissingSummary(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"character","name":"hero"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for missing summary")
	}
}

func TestElementCreateTool_Handle_InvalidKind(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"invalid","name":"hero","summary":"brave"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true for invalid kind")
	}
}

func TestElementCreateTool_Handle_Character(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"character","name":"hero","summary":"brave hero"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "element created: kind=character") {
		t.Errorf("text = %q", text)
	}
	if !strings.Contains(text, "name=hero") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_Character_WithExplicitID(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"character","name":"Hero","id":"custom-hero","summary":"brave hero"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "id=custom-hero") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_Setting(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"setting","name":"Royal Palace","summary":"the grand palace"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "element created: kind=setting") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_Foreshadowing(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"foreshadowing","name":"ancient sword","summary":"a sword found under the floor"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "element created: kind=foreshadowing") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_Timeline(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"timeline","name":"Main Story","summary":"the main plot timeline"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "element created: kind=timeline") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_Plot(t *testing.T) {
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"plot","name":"Love Story","summary":"the romance plot"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "element created: kind=plot") {
		t.Errorf("text = %q", text)
	}
}

func TestElementCreateTool_Handle_IDSlugify(t *testing.T) {
	// When no explicit id, name is slugified (lowercased, spaces to underscores)
	res, err := ElementCreateTool{}.Handle(context.Background(), json.RawMessage(`{"kind":"character","name":"Great Hero","summary":"the greatest"}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "id=great_hero") {
		t.Errorf("expected slugified id, text = %q", text)
	}
}
