package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// EventCreateTool creates a new TimelineEvent in the given timeline.
type EventCreateTool struct{}

type eventCreateArgs struct {
	TimelineID string   `json:"timeline_id"`
	Title      string   `json:"title"`
	Category   string   `json:"category"`
	Summary    string   `json:"summary"`
	Order      int      `json:"order"`
	Characters []string `json:"characters"`
	Settings   []string `json:"settings"`
	Chapters   []string `json:"chapters"`
}

// Definition advertises the event_create schema.
func (EventCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "event_create",
		Description: "Create a new event in a timeline",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["timeline_id", "title", "category", "summary"],
			"properties": {
				"timeline_id": {"type": "string", "description": "Target timeline ID"},
				"title":       {"type": "string", "description": "Event title"},
				"category":    {"type": "string", "description": "Event category (plot_point, character_event, world_event, backstory, foreshadow, climax, resolution)"},
				"summary":     {"type": "string", "description": "Event summary"},
				"order":       {"type": "integer", "description": "Relative order within timeline (default 0)"},
				"characters":  {"type": "array", "items": {"type": "string"}, "description": "Character IDs involved"},
				"settings":    {"type": "array", "items": {"type": "string"}, "description": "Setting IDs involved"},
				"chapters":    {"type": "array", "items": {"type": "string"}, "description": "Chapter IDs related"}
			}
		}`),
	}
}

// Handle validates args and returns a constructed TimelineEvent as JSON.
func (EventCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a eventCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.TimelineID == "" {
		return errorResult(fmt.Errorf("timeline_id is required")), nil
	}
	if a.Title == "" {
		return errorResult(fmt.Errorf("title is required")), nil
	}
	if a.Category == "" {
		return errorResult(fmt.Errorf("category is required")), nil
	}
	if a.Summary == "" {
		return errorResult(fmt.Errorf("summary is required")), nil
	}

	// Generate event ID from order position.
	// Why: simple deterministic ID rather than UUID — keeps output predictable
	// and avoids importing extra dependencies for a tool that doesn't persist data.
	eventID := fmt.Sprintf("event_%d", a.Order)

	chars := a.Characters
	if chars == nil {
		chars = []string{}
	}
	settings := a.Settings
	if settings == nil {
		settings = []string{}
	}
	chapters := a.Chapters
	if chapters == nil {
		chapters = []string{}
	}

	ev := domain.TimelineEvent{
		ID:       eventID,
		Title:    a.Title,
		Category: domain.EventCategory(a.Category),
		Time:     domain.TimePoint{Order: a.Order},
		Summary:  a.Summary,
		Characters: chars,
		Settings:   settings,
		Chapters:   chapters,
	}

	evJSON, err := json.MarshalIndent(ev, "", "  ")
	if err != nil {
		return errorResult(fmt.Errorf("marshal event: %w", err)), nil
	}

	text := fmt.Sprintf("event created: %s in %s\n%s", eventID, a.TimelineID, string(evJSON))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}
