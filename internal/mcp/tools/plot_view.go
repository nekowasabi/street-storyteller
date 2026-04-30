package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
	"github.com/takets/street-storyteller/internal/project/store"
)

// PlotViewTool retrieves one or all plots from the project store.
//
// Why: store field allows unit tests to inject a pre-populated store without
// touching the filesystem; when nil, Handle falls back to project.Load.
// This mirrors the pattern used by TimelineViewTool.
type PlotViewTool struct {
	store *store.Store
}

type plotViewArgs struct {
	ID         string `json:"id"`
	FilterType string `json:"filter_type"`
}

// Definition advertises the plot_view schema.
func (PlotViewTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "plot_view",
		Description: "View a specific plot by ID, or list all plots with optional type filter",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"properties":{
				"id":{"type":"string","description":"Plot ID; omit to list all plots"},
				"filter_type":{"type":"string","enum":["main","sub","parallel","background"],"description":"Filter list by plot type"}
			}
		}`),
	}
}

// Handle looks up a plot by id (or lists all) from the store.
func (t PlotViewTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a plotViewArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	st, err := t.resolveStore(ec)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	if a.ID != "" {
		return t.handleByID(st, a.ID)
	}
	return t.handleList(st, a.FilterType)
}

// resolveStore returns the injected store or loads from disk.
func (t PlotViewTool) resolveStore(ec ExecutionContext) (*store.Store, error) {
	if t.store != nil {
		return t.store, nil
	}
	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return nil, err
	}
	return proj.Store, nil
}

func (PlotViewTool) handleByID(st *store.Store, id string) (*protocol.CallToolResult, error) {
	sp, err := st.Plot(id)
	if err != nil {
		return errorResult(err), nil
	}
	text := fmt.Sprintf("id: %s\nname: %s\ntype: %s\nstatus: %s\nsummary: %s\nbeat_count: %d\nintersection_count: %d",
		sp.ID, sp.Name, sp.Type, sp.Status, sp.Summary,
		len(sp.Beats), len(sp.Intersections))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}

func (PlotViewTool) handleList(st *store.Store, filterType string) (*protocol.CallToolResult, error) {
	all := st.AllPlots()

	var plots []*domain.Plot
	if filterType == "" {
		plots = all
	} else {
		ft := domain.PlotType(filterType)
		for _, sp := range all {
			if sp.Type == ft {
				plots = append(plots, sp)
			}
		}
	}

	if len(plots) == 0 {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "no plots found"}},
		}, nil
	}

	var sb strings.Builder
	for _, sp := range plots {
		fmt.Fprintf(&sb, "- %s (%s): %s\n", sp.Name, sp.ID, sp.Type)
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: strings.TrimRight(sb.String(), "\n")}},
	}, nil
}
