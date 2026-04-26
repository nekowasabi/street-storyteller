package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
	"github.com/takets/street-storyteller/internal/project/store"
)

// TimelineAnalyzeTool reports basic causal-link statistics for a Timeline.
//
// Why: store field allows unit tests to inject a pre-populated store; when nil
// Handle falls back to project.Load — same pattern as TimelineViewTool.
type TimelineAnalyzeTool struct {
	store *store.Store
}

type timelineAnalyzeArgs struct {
	ID string `json:"id"`
}

// Definition advertises the timeline_analyze schema.
func (TimelineAnalyzeTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "timeline_analyze",
		Description: "Analyze a timeline's events and causal links",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"required":["id"],
			"properties":{
				"id":{"type":"string","description":"Timeline ID to analyze"}
			}
		}`),
	}
}

// Handle retrieves the timeline and produces a concise analysis summary.
func (t TimelineAnalyzeTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a timelineAnalyzeArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	if a.ID == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "id is required"}},
			IsError: true,
		}, nil
	}

	st, err := t.resolveStore(ec)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	tl, err := st.Timeline(a.ID)
	if err != nil {
		return errorResult(err), nil
	}

	eventCount := len(tl.Events)
	causalCount := countCausalLinks(tl.Events)

	text := fmt.Sprintf(
		"timeline: %s\nevents: %d\ncausal_links: %d",
		tl.Name, eventCount, causalCount,
	)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}

// resolveStore returns the injected store or loads from disk.
func (t TimelineAnalyzeTool) resolveStore(ec ExecutionContext) (*store.Store, error) {
	if t.store != nil {
		return t.store, nil
	}
	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return nil, err
	}
	return proj.Store, nil
}

// countCausalLinks returns the number of events that have at least one causal
// link (CausedBy or Causes populated).
func countCausalLinks(events []domain.TimelineEvent) int {
	count := 0
	for _, e := range events {
		if len(e.CausedBy) > 0 || len(e.Causes) > 0 {
			count++
		}
	}
	return count
}
