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

// TimelineCreateTool validates inputs and returns the generated Timeline stub.
// Why: persistence is out of scope for this tool — the caller (CLI/MCP client)
// owns the write path; the tool only generates and validates the structure.
type TimelineCreateTool struct{}

type timelineCreateArgs struct {
	Name    string `json:"name"`
	Scope   string `json:"scope"`
	Summary string `json:"summary"`
	ID      string `json:"id"`
}

var validScopes = map[domain.TimelineScope]struct{}{
	domain.TimelineScopeStory:     {},
	domain.TimelineScopeWorld:     {},
	domain.TimelineScopeCharacter: {},
	domain.TimelineScopeArc:       {},
}

// timelineSlugify converts a human-readable name into a lowercase underscore id.
var timelineSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

func timelineSlugify(name string) string {
	s := strings.ToLower(name)
	s = timelineSlugRe.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	return s
}

// Definition advertises the timeline_create schema.
func (TimelineCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "timeline_create",
		Description: "Create a new timeline and return its structure as JSON",
		InputSchema: json.RawMessage(`{
			"type":"object",
			"required":["name","scope","summary"],
			"properties":{
				"name":{"type":"string","description":"Human-readable timeline name"},
				"scope":{"type":"string","enum":["story","world","character","arc"],"description":"Timeline scope"},
				"summary":{"type":"string","description":"Brief summary of the timeline"},
				"id":{"type":"string","description":"Optional ID; derived from name if omitted"}
			}
		}`),
	}
}

// Handle validates args and returns the generated Timeline stub as text.
func (TimelineCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a timelineCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.Name == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "name is required"}},
			IsError: true,
		}, nil
	}
	if a.Scope == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "scope is required"}},
			IsError: true,
		}, nil
	}
	if a.Summary == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "summary is required"}},
			IsError: true,
		}, nil
	}

	scope := domain.TimelineScope(a.Scope)
	if _, ok := validScopes[scope]; !ok {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("invalid scope %q: must be one of story, world, character, arc", a.Scope)}},
			IsError: true,
		}, nil
	}

	id := a.ID
	if id == "" {
		id = timelineSlugify(a.Name)
	}

	tl := domain.Timeline{
		ID:      id,
		Name:    a.Name,
		Scope:   scope,
		Summary: a.Summary,
		Events:  []domain.TimelineEvent{},
	}

	b, _ := json.Marshal(tl)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("timeline created: %s\n%s", id, string(b)),
		}},
	}, nil
}
