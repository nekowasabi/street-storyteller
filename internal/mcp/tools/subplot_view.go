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

// SubplotViewTool retrieves one or all subplots from the project store.
//
// Why: store field allows unit tests to inject a pre-populated store without
// touching the filesystem; when nil, Handle falls back to project.Load.
// This mirrors the pattern used by TimelineViewTool.
type SubplotViewTool struct {
	store *store.Store
}

type subplotViewArgs struct {
	ID         string `json:"id"`
	FilterType string `json:"filter_type"`
}

// Definition advertises the subplot_view schema.
func (SubplotViewTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "subplot_view",
		Description: "View a specific subplot by ID, or list all subplots with optional type filter",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"properties":{
				"id":{"type":"string","description":"Subplot ID; omit to list all subplots"},
				"filter_type":{"type":"string","enum":["main","subplot","parallel","background"],"description":"Filter list by subplot type"}
			}
		}`),
	}
}

// Handle looks up a subplot by id (or lists all) from the store.
func (t SubplotViewTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a subplotViewArgs
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
func (t SubplotViewTool) resolveStore(ec ExecutionContext) (*store.Store, error) {
	if t.store != nil {
		return t.store, nil
	}
	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return nil, err
	}
	return proj.Store, nil
}

func (SubplotViewTool) handleByID(st *store.Store, id string) (*protocol.CallToolResult, error) {
	sp, err := st.Subplot(id)
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

func (SubplotViewTool) handleList(st *store.Store, filterType string) (*protocol.CallToolResult, error) {
	all := st.AllSubplots()

	var subplots []*domain.Subplot
	if filterType == "" {
		subplots = all
	} else {
		ft := domain.SubplotType(filterType)
		for _, sp := range all {
			if sp.Type == ft {
				subplots = append(subplots, sp)
			}
		}
	}

	if len(subplots) == 0 {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "no subplots found"}},
		}, nil
	}

	var sb strings.Builder
	for _, sp := range subplots {
		fmt.Fprintf(&sb, "- %s (%s): %s\n", sp.Name, sp.ID, sp.Type)
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: strings.TrimRight(sb.String(), "\n")}},
	}, nil
}
