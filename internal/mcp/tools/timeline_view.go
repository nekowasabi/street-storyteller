package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
	"github.com/takets/street-storyteller/internal/project/store"
)

// TimelineViewTool retrieves one or all timelines from the project store.
//
// Why: store field allows unit tests to inject a pre-populated store without
// touching the filesystem; when nil, Handle falls back to project.Load.
type TimelineViewTool struct {
	store *store.Store
}

type timelineViewArgs struct {
	ID string `json:"id"`
}

// Definition advertises the timeline_view schema.
func (TimelineViewTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "timeline_view",
		Description: "View a specific timeline by ID, or list all timelines",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"properties":{
				"id":{"type":"string","description":"Timeline ID; omit to list all timelines"}
			}
		}`),
	}
}

// Handle looks up a timeline by id (or lists all) from the store.
func (t TimelineViewTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a timelineViewArgs
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
	return t.handleList(st)
}

// resolveStore returns the injected store or loads from disk.
func (t TimelineViewTool) resolveStore(ec ExecutionContext) (*store.Store, error) {
	if t.store != nil {
		return t.store, nil
	}
	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return nil, err
	}
	return proj.Store, nil
}

func (TimelineViewTool) handleByID(st *store.Store, id string) (*protocol.CallToolResult, error) {
	tl, err := st.Timeline(id)
	if err != nil {
		return errorResult(err), nil
	}
	text := fmt.Sprintf("id: %s\nname: %s\nscope: %s\nsummary: %s\nevent_count: %d",
		tl.ID, tl.Name, tl.Scope, tl.Summary, len(tl.Events))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}

func (TimelineViewTool) handleList(st *store.Store) (*protocol.CallToolResult, error) {
	timelines := st.AllTimelines()
	if len(timelines) == 0 {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "no timelines found"}},
		}, nil
	}
	var sb strings.Builder
	for _, tl := range timelines {
		fmt.Fprintf(&sb, "- %s (%s): %s\n", tl.Name, tl.ID, tl.Scope)
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: strings.TrimRight(sb.String(), "\n")}},
	}, nil
}
