package tools

import (
	"context"
	"encoding/json"
	"testing"
)

func TestEventUpdateTool_Definition(t *testing.T) {
	def := EventUpdateTool{}.Definition()
	if def.Name != "event_update" {
		t.Errorf("name = %q", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestEventUpdateTool_Handle_MissingTimelineID(t *testing.T) {
	args := json.RawMessage(`{"event_id": "event_001", "title": "Updated Title"}`)
	res, err := EventUpdateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing timeline_id")
	}
}

func TestEventUpdateTool_Handle_MissingEventID(t *testing.T) {
	args := json.RawMessage(`{"timeline_id": "main_story", "title": "Updated Title"}`)
	res, err := EventUpdateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing event_id")
	}
}

func TestEventUpdateTool_Handle_TimelineNotFound(t *testing.T) {
	// empty projectRoot → project.Load fails (no manifest), which is also a "not found" condition
	args := json.RawMessage(`{"timeline_id": "nonexistent", "event_id": "event_001", "title": "Updated"}`)
	res, err := EventUpdateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError when timeline not found, got: %q", res.Content[0].Text)
	}
}
