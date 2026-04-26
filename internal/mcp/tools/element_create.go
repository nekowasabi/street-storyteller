package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// validKinds is the set of allowed element kinds.
var validKinds = map[string]bool{
	"character":     true,
	"setting":       true,
	"foreshadowing": true,
	"timeline":      true,
	"subplot":       true,
}

// slugRe matches any sequence of characters that are not alphanumeric or underscore.
var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// ElementCreateTool scaffolds a story element skeleton.
type ElementCreateTool struct{}

type elementCreateArgs struct {
	Kind    string `json:"kind"`
	Name    string `json:"name"`
	Summary string `json:"summary"`
	ID      string `json:"id"`
}

// Definition advertises the element_create schema.
func (ElementCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "element_create",
		Description: "Scaffold a story element skeleton (character/setting/foreshadowing/timeline/subplot)",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"kind":{"type":"string","enum":["character","setting","foreshadowing","timeline","subplot"]},"name":{"type":"string"},"summary":{"type":"string"},"id":{"type":"string"}},"required":["kind","name","summary"]}`),
	}
}

// Handle validates arguments and returns an element created message.
// Why: persistence (file write) is out of scope; only the scaffold description
// is returned so callers can decide where to store it.
func (ElementCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a elementCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.Kind == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "kind is required"}},
			IsError: true,
		}, nil
	}
	if !validKinds[a.Kind] {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("invalid kind %q: must be one of character, setting, foreshadowing, timeline, subplot", a.Kind)}},
			IsError: true,
		}, nil
	}
	if a.Name == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "name is required"}},
			IsError: true,
		}, nil
	}
	if a.Summary == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "summary is required"}},
			IsError: true,
		}, nil
	}

	id := a.ID
	if id == "" {
		id = slugify(a.Name)
	}

	text := fmt.Sprintf("element created: kind=%s id=%s name=%s", a.Kind, id, a.Name)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}

// slugify converts a name to a lowercase underscore-separated identifier.
func slugify(name string) string {
	lower := strings.ToLower(name)
	slug := slugRe.ReplaceAllString(lower, "_")
	slug = strings.Trim(slug, "_")
	return slug
}
