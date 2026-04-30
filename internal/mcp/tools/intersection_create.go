package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// IntersectionCreateTool creates a PlotIntersection between two plot beats.
type IntersectionCreateTool struct{}

type intersectionCreateArgs struct {
	SourcePlot         string `json:"source_plot"`
	SourceBeat         string `json:"source_beat"`
	TargetPlot         string `json:"target_plot"`
	TargetBeat         string `json:"target_beat"`
	Summary            string `json:"summary"`
	InfluenceDirection string `json:"influence_direction"`
	InfluenceLevel     string `json:"influence_level"`
}

// Definition advertises the intersection_create schema.
func (IntersectionCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "intersection_create",
		Description: "Create a plot intersection linking a beat in one plot to a beat in another",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"source_plot":      {"type": "string", "description": "Source plot ID (required)"},
				"source_beat":         {"type": "string", "description": "Source beat ID (required)"},
				"target_plot":      {"type": "string", "description": "Target plot ID (required)"},
				"target_beat":         {"type": "string", "description": "Target beat ID (required)"},
				"summary":             {"type": "string", "description": "Intersection summary (required)"},
				"influence_direction": {"type": "string", "description": "forward/backward/mutual (default: forward)"},
				"influence_level":     {"type": "string", "description": "high/medium/low (default: medium)"}
			},
			"required": ["source_plot", "source_beat", "target_plot", "target_beat", "summary"]
		}`),
	}
}

// Handle validates args and returns the created PlotIntersection as JSON text.
func (IntersectionCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a intersectionCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.SourcePlot == "" {
		return errResult("source_plot is required"), nil
	}
	if a.SourceBeat == "" {
		return errResult("source_beat is required"), nil
	}
	if a.TargetPlot == "" {
		return errResult("target_plot is required"), nil
	}
	if a.TargetBeat == "" {
		return errResult("target_beat is required"), nil
	}
	if a.Summary == "" {
		return errResult("summary is required"), nil
	}

	dir := domain.InfluenceDirection(a.InfluenceDirection)
	if dir == "" {
		dir = domain.InfluenceDirectionForward
	}

	level := domain.InfluenceLevel(a.InfluenceLevel)
	if level == "" {
		level = domain.InfluenceLevelMedium
	}

	id := fmt.Sprintf("ix_%s_%s_%s_%s", a.SourcePlot, a.SourceBeat, a.TargetPlot, a.TargetBeat)

	intersection := domain.PlotIntersection{
		ID:                 id,
		SourcePlotID:       a.SourcePlot,
		SourceBeatID:       a.SourceBeat,
		TargetPlotID:       a.TargetPlot,
		TargetBeatID:       a.TargetBeat,
		Summary:            a.Summary,
		InfluenceDirection: dir,
		InfluenceLevel:     &level,
	}

	b, _ := json.Marshal(intersection)
	text := fmt.Sprintf("intersection created: %s\n%s", intersection.ID, string(b))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}
