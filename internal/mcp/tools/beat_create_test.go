package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestBeatCreateTool_Definition(t *testing.T) {
	def := BeatCreateTool{}.Definition()
	if def.Name != "beat_create" {
		t.Errorf("name = %q, want beat_create", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestBeatCreateTool_Handle_MissingPlotID(t *testing.T) {
	args := json.RawMessage(`{"title":"opening","summary":"the start"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing plot_id")
	}
}

func TestBeatCreateTool_Handle_MissingTitle(t *testing.T) {
	args := json.RawMessage(`{"plot_id":"sp1","summary":"the start"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing title")
	}
}

func TestBeatCreateTool_Handle_MissingSummary(t *testing.T) {
	args := json.RawMessage(`{"plot_id":"sp1","title":"opening"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for missing summary")
	}
}

func TestBeatCreateTool_Handle_Success_DefaultPosition(t *testing.T) {
	args := json.RawMessage(`{"plot_id":"sp1","title":"opening","summary":"the start"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: content=%v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "beat created:") {
		t.Errorf("text = %q, want 'beat created:'", text)
	}
	if !strings.Contains(text, "sp1") {
		t.Errorf("text = %q, want plot_id 'sp1'", text)
	}
}

func TestBeatCreateTool_Handle_CustomID(t *testing.T) {
	args := json.RawMessage(`{"plot_id":"sp1","title":"opening","summary":"the start","id":"beat_001"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: content=%v", res.Content)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "beat_001") {
		t.Errorf("text = %q, want id 'beat_001'", text)
	}
}

func TestBeatCreateTool_Handle_CustomStructurePosition(t *testing.T) {
	args := json.RawMessage(`{"plot_id":"sp1","title":"opening","summary":"the start","structure_position":"climax"}`)
	res, err := BeatCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: content=%v", res.Content)
	}
}
