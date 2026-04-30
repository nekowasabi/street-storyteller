package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// BeatCreateTool creates a PlotBeat inside a Plot.
type BeatCreateTool struct{}

type beatCreateArgs struct {
	PlotID            string `json:"plot_id"`
	Title             string `json:"title"`
	Summary           string `json:"summary"`
	StructurePosition string `json:"structure_position"`
	ID                string `json:"id"`
}

// Definition advertises the beat_create schema.
func (BeatCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "beat_create",
		Description: "Create a plot beat inside a plot",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"plot_id":          {"type": "string", "description": "Target plot ID (required)"},
				"title":               {"type": "string", "description": "Beat title (required)"},
				"summary":             {"type": "string", "description": "Beat summary (required)"},
				"structure_position":  {"type": "string", "description": "Narrative position: setup/rising/climax/falling/resolution (default: rising)"},
				"id":                  {"type": "string", "description": "Optional explicit ID; auto-generated if omitted"}
			},
			"required": ["plot_id", "title", "summary"]
		}`),
	}
}

// Handle validates args and returns the created PlotBeat as JSON text.
func (BeatCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a beatCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.PlotID == "" {
		return errResult("plot_id is required"), nil
	}
	if a.Title == "" {
		return errResult("title is required"), nil
	}
	if a.Summary == "" {
		return errResult("summary is required"), nil
	}

	pos := domain.StructurePosition(a.StructurePosition)
	if pos == "" {
		pos = domain.StructurePositionRising
	}

	id := a.ID
	if id == "" {
		id = fmt.Sprintf("beat_%s_%s", a.PlotID, sanitizeID(a.Title))
	}

	beat := domain.PlotBeat{
		ID:                id,
		Title:             a.Title,
		Summary:           a.Summary,
		StructurePosition: pos,
	}

	b, _ := json.Marshal(beat)
	text := fmt.Sprintf("beat created: %s in %s\n%s", beat.ID, a.PlotID, string(b))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}
