package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
)

// ViewBrowserTool renders a single entity as a minimal HTML snippet.
type ViewBrowserTool struct{}

type viewBrowserArgs struct {
	Entity string `json:"entity"`
	ID     string `json:"id"`
}

// Definition advertises the view_browser schema.
func (ViewBrowserTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "view_browser",
		Description: "Render an entity (character/setting/...) as HTML",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"entity":{"type":"string"},"id":{"type":"string"}}}`),
	}
}

// Handle loads the project and looks up the requested entity. Best-effort
// HTML for character/setting only in the Green phase.
func (ViewBrowserTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a viewBrowserArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	if a.Entity == "" || a.ID == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "entity and id are required"}},
			IsError: true,
		}, nil
	}

	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	var name, summary string
	switch a.Entity {
	case "character":
		c, err := proj.Store.Character(a.ID)
		if err != nil {
			return errorResult(err), nil
		}
		name, summary = c.Name, c.Summary
	case "setting":
		s, err := proj.Store.Setting(a.ID)
		if err != nil {
			return errorResult(err), nil
		}
		name, summary = s.Name, s.Summary
	default:
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "unsupported entity: " + a.Entity}},
			IsError: true,
		}, nil
	}

	html := fmt.Sprintf("<html><body><h1>%s</h1><p>%s</p></body></html>", name, summary)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: html}},
	}, nil
}

func errorResult(err error) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
		IsError: true,
	}
}
