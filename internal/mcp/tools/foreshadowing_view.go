package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
)

// ForeshadowingViewTool displays one foreshadowing by ID or lists all with
// optional status filtering.
type ForeshadowingViewTool struct{}

type foreshadowingViewArgs struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// Definition advertises the foreshadowing_view schema.
func (ForeshadowingViewTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "foreshadowing_view",
		Description: "View foreshadowing entities: detail by ID or filtered list",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"id":     {"type": "string", "description": "Foreshadowing ID for detail view (omit for list)"},
				"status": {"type": "string", "enum": ["planted","partially_resolved","resolved","abandoned"], "description": "Filter list by status"}
			}
		}`),
	}
}

// Handle loads the project and either returns a single foreshadowing detail
// (when id is given) or a list of all foreshadowings (optionally filtered by status).
func (ForeshadowingViewTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a foreshadowingViewArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	if a.ID != "" {
		return handleForeshadowingDetail(proj, a.ID)
	}
	return handleForeshadowingList(proj, a.Status)
}

// handleForeshadowingDetail fetches a single foreshadowing by ID and formats it.
func handleForeshadowingDetail(proj *project.Project, id string) (*protocol.CallToolResult, error) {
	f, err := proj.Store.Foreshadowing(id)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, "name: %s\n", f.Name)
	fmt.Fprintf(&sb, "type: %s\n", f.Type)
	fmt.Fprintf(&sb, "status: %s\n", f.Status)
	fmt.Fprintf(&sb, "summary: %s\n", f.Summary)
	fmt.Fprintf(&sb, "planting: chapter=%s — %s\n", f.Planting.Chapter, f.Planting.Description)
	if f.Importance != nil {
		fmt.Fprintf(&sb, "importance: %s\n", *f.Importance)
	}
	if f.PlannedResolutionChapter != nil {
		fmt.Fprintf(&sb, "planned_resolution_chapter: %s\n", *f.PlannedResolutionChapter)
	}
	if len(f.Resolutions) > 0 {
		fmt.Fprintf(&sb, "resolutions: %d\n", len(f.Resolutions))
		for i, r := range f.Resolutions {
			fmt.Fprintf(&sb, "  [%d] chapter=%s completeness=%.0f%% — %s\n",
				i+1, r.Chapter, r.Completeness*100, r.Description)
		}
	}

	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: sb.String()}},
	}, nil
}

// handleForeshadowingList returns all foreshadowings, optionally filtered by status.
func handleForeshadowingList(proj *project.Project, statusFilter string) (*protocol.CallToolResult, error) {
	all := proj.Store.AllForeshadowings()

	var filtered []*domain.Foreshadowing
	if statusFilter == "" {
		filtered = all
	} else {
		for _, f := range all {
			if string(f.Status) == statusFilter {
				filtered = append(filtered, f)
			}
		}
	}

	if len(filtered) == 0 {
		msg := fmt.Sprintf("0 foreshadowings")
		if statusFilter != "" {
			msg = fmt.Sprintf("0 foreshadowings with status %q", statusFilter)
		}
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		}, nil
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, "%d foreshadowing(s):\n", len(filtered))
	for _, f := range filtered {
		fmt.Fprintf(&sb, "- %s | type: %s | status: %s\n", f.ID, f.Type, f.Status)
	}

	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: sb.String()}},
	}, nil
}
