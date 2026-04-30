package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestPlotCreateTool_Definition(t *testing.T) {
	def := PlotCreateTool{}.Definition()
	if def.Name != "plot_create" {
		t.Errorf("name = %q, want plot_create", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestPlotCreateTool_Handle_Success(t *testing.T) {
	args := json.RawMessage(`{"name":"Main Plot","type":"main","summary":"The hero's journey"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "plot created: main_plot") {
		t.Errorf("expected 'plot created: main_plot' in %q", text)
	}
	if !strings.Contains(text, `"main"`) {
		t.Errorf("expected type 'main' in JSON output: %q", text)
	}
}

func TestPlotCreateTool_Handle_MissingName(t *testing.T) {
	args := json.RawMessage(`{"type":"sub","summary":"A side story"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
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

func TestPlotCreateTool_Handle_MissingType(t *testing.T) {
	args := json.RawMessage(`{"name":"Love Story","summary":"A romance arc"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
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

func TestPlotCreateTool_Handle_MissingSummary(t *testing.T) {
	args := json.RawMessage(`{"name":"Revenge Plot","type":"sub"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
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

func TestPlotCreateTool_Handle_InvalidType(t *testing.T) {
	args := json.RawMessage(`{"name":"Mystery Arc","type":"unknown","summary":"A mystery"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
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

func TestPlotCreateTool_Handle_ExplicitID(t *testing.T) {
	args := json.RawMessage(`{"name":"Love Story","type":"sub","summary":"Romance arc","id":"custom_id"}`)
	res, err := PlotCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Fatalf("unexpected IsError: %s", res.Content[0].Text)
	}
	if !strings.Contains(res.Content[0].Text, "plot created: custom_id") {
		t.Errorf("expected explicit id in output: %q", res.Content[0].Text)
	}
}

func TestPlotCreateTool_DefinitionUsesSubType(t *testing.T) {
	def := PlotCreateTool{}.Definition()
	schema := string(def.InputSchema)
	if !strings.Contains(schema, `"sub"`) {
		t.Fatalf("schema must expose sub plot type: %s", schema)
	}
	legacy := `"sub` + `plot"`
	if strings.Contains(schema, legacy) {
		t.Fatalf("schema must not expose legacy plot subtype: %s", schema)
	}
}
