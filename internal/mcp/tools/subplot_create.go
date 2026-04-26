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

// subplotSlugRe strips characters unsuitable for a slug ID.
var subplotSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

// subplotSlugify converts a human-readable name into a lowercase underscore id.
// Why: local helper to avoid depending on a package-level slugify that may not
// exist in this tools package; mirrors the convention in timeline_create.go.
func subplotSlugify(name string) string {
	s := strings.ToLower(name)
	s = subplotSlugRe.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	if s == "" {
		return fmt.Sprintf("sp_%x", name)
	}
	return s
}

// SubplotCreateTool validates inputs and returns the generated Subplot stub.
// Why: persistence is out of scope — consistent with the pattern used by
// timeline_create and foreshadowing_create; the tool only validates and
// serialises the domain struct so the caller can inspect inputs before writing.
type SubplotCreateTool struct{}

type subplotCreateArgs struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Summary string `json:"summary"`
	ID      string `json:"id"`
}

var validSubplotTypes = map[string]domain.SubplotType{
	"main":       domain.SubplotTypeMain,
	"subplot":    domain.SubplotTypeSubplot,
	"parallel":   domain.SubplotTypeParallel,
	"background": domain.SubplotTypeBackground,
}

// Definition advertises the subplot_create schema.
func (SubplotCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "subplot_create",
		Description: "Create a new subplot and return its structure as JSON",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"required":["name","type","summary"],
			"properties":{
				"name":{"type":"string","description":"Human-readable subplot name"},
				"type":{"type":"string","enum":["main","subplot","parallel","background"],"description":"Narrative role of the subplot"},
				"summary":{"type":"string","description":"Brief summary of the subplot"},
				"id":{"type":"string","description":"Optional ID; derived from name if omitted"}
			}
		}`),
	}
}

// Handle validates args and returns the generated Subplot stub as text.
func (SubplotCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a subplotCreateArgs
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

	st, ok := validSubplotTypes[a.Type]
	if !ok {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("invalid type %q: must be one of main, subplot, parallel, background", a.Type)}},
			IsError: true,
		}, nil
	}

	id := a.ID
	if id == "" {
		id = subplotSlugify(a.Name)
	}

	sp := domain.Subplot{
		ID:      id,
		Name:    a.Name,
		Type:    st,
		Status:  domain.SubplotStatusActive,
		Summary: a.Summary,
		Beats:   []domain.PlotBeat{},
	}

	b, _ := json.Marshal(sp)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("subplot created: %s\n%s", id, string(b)),
		}},
	}, nil
}
