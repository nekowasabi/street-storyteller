package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestEventCreateTool_Definition(t *testing.T) {
	def := EventCreateTool{}.Definition()
	if def.Name != "event_create" {
		t.Errorf("name = %q", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestEventCreateTool_Handle_Success(t *testing.T) {
	args := json.RawMessage(`{
		"timeline_id": "main_story",
		"title": "Battle of Dawn",
		"category": "climax",
		"summary": "The final confrontation",
		"order": 5,
		"characters": ["hero", "villain"],
		"settings": ["battlefield"],
		"chapters": ["chapter_10"]
	}`)
	res, err := EventCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %s", res.Content[0].Text)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "event created") {
		t.Errorf("text should contain 'event created', got: %q", text)
	}
	if !strings.Contains(text, "main_story") {
		t.Errorf("text should contain timeline_id 'main_story', got: %q", text)
	}
}

func TestEventCreateTool_Handle_MissingRequired(t *testing.T) {
	// timeline_id missing
	args := json.RawMessage(`{"title": "some event", "category": "plot_point", "summary": "desc"}`)
	res, err := EventCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing timeline_id")
	}
}

func TestEventCreateTool_Handle_MissingTitle(t *testing.T) {
	// title missing
	args := json.RawMessage(`{"timeline_id": "main_story", "category": "plot_point", "summary": "desc"}`)
	res, err := EventCreateTool{}.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing title")
	}
}
