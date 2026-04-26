package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
)

// EventUpdateTool updates fields of an existing TimelineEvent.
type EventUpdateTool struct{}

type eventUpdateArgs struct {
	TimelineID string   `json:"timeline_id"`
	EventID    string   `json:"event_id"`
	Title      *string  `json:"title,omitempty"`
	Summary    *string  `json:"summary,omitempty"`
	Importance *string  `json:"importance,omitempty"`
	Characters []string `json:"characters,omitempty"`
	Settings   []string `json:"settings,omitempty"`
	Chapters   []string `json:"chapters,omitempty"`
}

// Definition advertises the event_update schema.
func (EventUpdateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "event_update",
		Description: "Update fields of an existing event in a timeline",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["timeline_id", "event_id"],
			"properties": {
				"timeline_id": {"type": "string", "description": "Target timeline ID"},
				"event_id":    {"type": "string", "description": "Event ID to update"},
				"title":       {"type": "string", "description": "New event title"},
				"summary":     {"type": "string", "description": "New event summary"},
				"importance":  {"type": "string", "description": "Event importance (major, minor, background)"},
				"characters":  {"type": "array", "items": {"type": "string"}, "description": "Updated character IDs"},
				"settings":    {"type": "array", "items": {"type": "string"}, "description": "Updated setting IDs"},
				"chapters":    {"type": "array", "items": {"type": "string"}, "description": "Updated chapter IDs"}
			}
		}`),
	}
}

// Handle loads the timeline from the project, finds the event, applies updates,
// and returns the updated event as JSON.
// Persistence is not performed — this is a read-validate-display operation.
func (EventUpdateTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a eventUpdateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.TimelineID == "" {
		return errorResult(fmt.Errorf("timeline_id is required")), nil
	}
	if a.EventID == "" {
		return errorResult(fmt.Errorf("event_id is required")), nil
	}

	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return errorResult(fmt.Errorf("load project: %w", err)), nil
	}

	tl, err := proj.Store.Timeline(a.TimelineID)
	if err != nil {
		return errorResult(fmt.Errorf("timeline not found: %s", a.TimelineID)), nil
	}

	// Find and copy the target event.
	var found *domain.TimelineEvent
	for i := range tl.Events {
		if tl.Events[i].ID == a.EventID {
			cp := tl.Events[i]
			found = &cp
			break
		}
	}
	if found == nil {
		return errorResult(fmt.Errorf("event not found: %s in timeline %s", a.EventID, a.TimelineID)), nil
	}

	// Apply optional field updates.
	if a.Title != nil {
		found.Title = *a.Title
	}
	if a.Summary != nil {
		found.Summary = *a.Summary
	}
	if a.Importance != nil {
		imp := domain.EventImportance(*a.Importance)
		found.Importance = &imp
	}
	if a.Characters != nil {
		found.Characters = a.Characters
	}
	if a.Settings != nil {
		found.Settings = a.Settings
	}
	if a.Chapters != nil {
		found.Chapters = a.Chapters
	}

	evJSON, err := json.MarshalIndent(found, "", "  ")
	if err != nil {
		return errorResult(fmt.Errorf("marshal event: %w", err)), nil
	}

	text := fmt.Sprintf("event updated: %s\n%s", a.EventID, string(evJSON))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}
