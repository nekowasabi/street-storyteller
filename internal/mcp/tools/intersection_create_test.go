package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestIntersectionCreateTool_Definition(t *testing.T) {
	def := IntersectionCreateTool{}.Definition()
	if def.Name != "intersection_create" {
		t.Errorf("name = %q, want intersection_create", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestIntersectionCreateTool_Handle_MissingSourceSubplot(t *testing.T) {
	args := json.RawMessage(`{"source_beat":"b1","target_subplot":"sp2","target_beat":"b2","summary":"they meet"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing source_subplot")
	}
}

func TestIntersectionCreateTool_Handle_MissingSourceBeat(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","target_subplot":"sp2","target_beat":"b2","summary":"they meet"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing source_beat")
	}
}

func TestIntersectionCreateTool_Handle_MissingTargetSubplot(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","source_beat":"b1","target_beat":"b2","summary":"they meet"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing target_subplot")
	}
}

func TestIntersectionCreateTool_Handle_MissingTargetBeat(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","source_beat":"b1","target_subplot":"sp2","summary":"they meet"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing target_beat")
	}
}

func TestIntersectionCreateTool_Handle_MissingSummary(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","source_beat":"b1","target_subplot":"sp2","target_beat":"b2"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing summary")
	}
}

func TestIntersectionCreateTool_Handle_Success_Defaults(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","source_beat":"b1","target_subplot":"sp2","target_beat":"b2","summary":"they meet"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: content=%v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "intersection created:") {
		t.Errorf("text = %q, want 'intersection created:'", text)
	}
}

func TestIntersectionCreateTool_Handle_Success_CustomOptions(t *testing.T) {
	args := json.RawMessage(`{"source_subplot":"sp1","source_beat":"b1","target_subplot":"sp2","target_beat":"b2","summary":"they meet","influence_direction":"mutual","influence_level":"high"}`)
	res, err := IntersectionCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: content=%v", res.Content)
	}
}
