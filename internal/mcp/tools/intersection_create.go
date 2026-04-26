package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// IntersectionCreateTool creates a PlotIntersection between two subplot beats.
type IntersectionCreateTool struct{}

type intersectionCreateArgs struct {
	SourceSubplot      string `json:"source_subplot"`
	SourceBeat         string `json:"source_beat"`
	TargetSubplot      string `json:"target_subplot"`
	TargetBeat         string `json:"target_beat"`
	Summary            string `json:"summary"`
	InfluenceDirection string `json:"influence_direction"`
	InfluenceLevel     string `json:"influence_level"`
}

// Definition advertises the intersection_create schema.
func (IntersectionCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "intersection_create",
		Description: "Create a plot intersection linking a beat in one subplot to a beat in another",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"source_subplot":      {"type": "string", "description": "Source subplot ID (required)"},
				"source_beat":         {"type": "string", "description": "Source beat ID (required)"},
				"target_subplot":      {"type": "string", "description": "Target subplot ID (required)"},
				"target_beat":         {"type": "string", "description": "Target beat ID (required)"},
				"summary":             {"type": "string", "description": "Intersection summary (required)"},
				"influence_direction": {"type": "string", "description": "forward/backward/mutual (default: forward)"},
				"influence_level":     {"type": "string", "description": "high/medium/low (default: medium)"}
			},
			"required": ["source_subplot", "source_beat", "target_subplot", "target_beat", "summary"]
		}`),
	}
}

// Handle validates args and returns the created PlotIntersection as JSON text.
func (IntersectionCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a intersectionCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.SourceSubplot == "" {
		return errResult("source_subplot is required"), nil
	}
	if a.SourceBeat == "" {
		return errResult("source_beat is required"), nil
	}
	if a.TargetSubplot == "" {
		return errResult("target_subplot is required"), nil
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

	id := fmt.Sprintf("ix_%s_%s_%s_%s", a.SourceSubplot, a.SourceBeat, a.TargetSubplot, a.TargetBeat)

	intersection := domain.PlotIntersection{
		ID:                 id,
		SourceSubplotID:    a.SourceSubplot,
		SourceBeatID:       a.SourceBeat,
		TargetSubplotID:    a.TargetSubplot,
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
