package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestTimelineCreateTool_Definition(t *testing.T) {
	def := TimelineCreateTool{}.Definition()
	if def.Name != "timeline_create" {
		t.Errorf("name = %q, want timeline_create", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestTimelineCreateTool_Handle_Success(t *testing.T) {
	args := json.RawMessage(`{"name":"Main Story","scope":"story","summary":"The main arc"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "timeline created:") {
		t.Errorf("text = %q, want 'timeline created: ...'", text)
	}
}

func TestTimelineCreateTool_Handle_MissingName(t *testing.T) {
	args := json.RawMessage(`{"scope":"story","summary":"no name"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing name, got: %+v", res)
	}
}

func TestTimelineCreateTool_Handle_MissingScope(t *testing.T) {
	args := json.RawMessage(`{"name":"X","summary":"no scope"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing scope, got: %+v", res)
	}
}

func TestTimelineCreateTool_Handle_MissingSummary(t *testing.T) {
	args := json.RawMessage(`{"name":"X","scope":"arc"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing summary, got: %+v", res)
	}
}

func TestTimelineCreateTool_Handle_InvalidScope(t *testing.T) {
	args := json.RawMessage(`{"name":"X","scope":"invalid","summary":"bad scope"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for invalid scope, got: %+v", res)
	}
}

func TestTimelineCreateTool_Handle_ExplicitID(t *testing.T) {
	args := json.RawMessage(`{"name":"Hero Journey","scope":"character","summary":"Hero arc","id":"hero_journey"}`)
	res, err := TimelineCreateTool{}.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	if !strings.Contains(res.Content[0].Text, "hero_journey") {
		t.Errorf("expected id hero_journey in text: %q", res.Content[0].Text)
	}
}
