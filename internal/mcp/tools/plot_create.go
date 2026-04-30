package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// plotSlugRe strips characters unsuitable for a slug ID.
var plotSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

// plotSlugify converts a human-readable name into a lowercase underscore id.
// Why: local helper to avoid depending on a package-level slugify that may not
// exist in this tools package; mirrors the convention in timeline_create.go.
func plotSlugify(name string) string {
	s := strings.ToLower(name)
	s = plotSlugRe.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	if s == "" {
		return fmt.Sprintf("sp_%x", name)
	}
	return s
}

// PlotCreateTool validates inputs and returns the generated Plot stub.
// Why: persistence is out of scope — consistent with the pattern used by
// timeline_create and foreshadowing_create; the tool only validates and
// serialises the domain struct so the caller can inspect inputs before writing.
type PlotCreateTool struct{}

type plotCreateArgs struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Summary string `json:"summary"`
	ID      string `json:"id"`
}

var validPlotTypes = map[string]domain.PlotType{
	"main":       domain.PlotTypeMain,
	"sub":        domain.PlotTypeSub,
	"parallel":   domain.PlotTypeParallel,
	"background": domain.PlotTypeBackground,
}

// Definition advertises the plot_create schema.
func (PlotCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "plot_create",
		Description: "Create a new plot and return its structure as JSON",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"required":["name","type","summary"],
			"properties":{
				"name":{"type":"string","description":"Human-readable plot name"},
				"type":{"type":"string","enum":["main","sub","parallel","background"],"description":"Narrative role of the plot"},
				"summary":{"type":"string","description":"Brief summary of the plot"},
				"id":{"type":"string","description":"Optional ID; derived from name if omitted"}
			}
		}`),
	}
}

// Handle validates args and returns the generated Plot stub as text.
func (PlotCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a plotCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.Name == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "name is required"}},
			IsError: true,
		}, nil
	}
	if a.Type == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "type is required"}},
			IsError: true,
		}, nil
	}
	if a.Summary == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "summary is required"}},
			IsError: true,
		}, nil
	}

	st, ok := validPlotTypes[a.Type]
	if !ok {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("invalid type %q: must be one of main, sub, parallel, background", a.Type)}},
			IsError: true,
		}, nil
	}

	id := a.ID
	if id == "" {
		id = plotSlugify(a.Name)
	}

	sp := domain.Plot{
		ID:      id,
		Name:    a.Name,
		Type:    st,
		Status:  domain.PlotStatusActive,
		Summary: a.Summary,
		Beats:   []domain.PlotBeat{},
	}

	b, _ := json.Marshal(sp)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("plot created: %s\n%s", id, string(b)),
		}},
	}, nil
}
