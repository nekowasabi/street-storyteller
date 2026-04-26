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

// ForeshadowingCreateTool creates a new foreshadowing entity and reports its ID.
type ForeshadowingCreateTool struct{}

type foreshadowingCreateArgs struct {
	ID                       string `json:"id"`
	Name                     string `json:"name"`
	Type                     string `json:"type"`
	Summary                  string `json:"summary"`
	PlantingChapter          string `json:"planting_chapter"`
	PlantingDescription      string `json:"planting_description"`
	Importance               string `json:"importance"`
	PlannedResolutionChapter string `json:"planned_resolution_chapter"`
}

// validForeshadowingTypes is the set of accepted ForeshadowingType values.
var validForeshadowingTypes = map[string]domain.ForeshadowingType{
	"hint":        domain.ForeshadowingTypeHint,
	"prophecy":    domain.ForeshadowingTypeProphecy,
	"mystery":     domain.ForeshadowingTypeMystery,
	"symbol":      domain.ForeshadowingTypeSymbol,
	"chekhov":     domain.ForeshadowingTypeChekhov,
	"red_herring": domain.ForeshadowingTypeRedHerring,
}

// validForeshadowingImportances is the set of accepted ForeshadowingImportance values.
var validForeshadowingImportances = map[string]domain.ForeshadowingImportance{
	"major":  domain.ForeshadowingImportanceMajor,
	"minor":  domain.ForeshadowingImportanceMinor,
	"subtle": domain.ForeshadowingImportanceSubtle,
}

// foreshadowingSlugRe matches characters that are not suitable in a slug ID.
var foreshadowingSlugRe = regexp.MustCompile(`[^a-zA-Z0-9_\-]`)

// foreshadowingSlugify converts a display name into a URL/file-safe identifier.
// Why: adopts the same simple snake_case convention used by the TypeScript
// side (spaces→underscores, lowercase, strip non-ascii).
func foreshadowingSlugify(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "_")
	s = foreshadowingSlugRe.ReplaceAllString(s, "")
	if s == "" {
		// Fallback for pure non-ASCII names (e.g. Japanese): use a hex digest
		// of the original to keep IDs stable and unique.
		s = fmt.Sprintf("f_%x", name)
	}
	return s
}

// Definition advertises the foreshadowing_create schema.
func (ForeshadowingCreateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "foreshadowing_create",
		Description: "Create a new foreshadowing entity in the storyteller project",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"id":                        {"type": "string", "description": "Optional ID (slugified from name if omitted)"},
				"name":                      {"type": "string", "description": "Display name of the foreshadowing"},
				"type":                      {"type": "string", "enum": ["hint","prophecy","mystery","symbol","chekhov","red_herring"]},
				"summary":                   {"type": "string", "description": "Short description of the foreshadowing"},
				"planting_chapter":          {"type": "string", "description": "Chapter where the foreshadowing is planted"},
				"planting_description":      {"type": "string", "description": "How the foreshadowing is planted"},
				"importance":                {"type": "string", "enum": ["major","minor","subtle"]},
				"planned_resolution_chapter":{"type": "string", "description": "Chapter where resolution is planned"}
			},
			"required": ["name","type","summary","planting_chapter","planting_description"]
		}`),
	}
}

// Handle validates arguments and returns the created foreshadowing summary.
//
// Why: the tool intentionally does not persist to disk — consistent with
// the Phase-Green approach where MCP tools report the entity structure
// rather than writing files (that responsibility belongs to the CLI layer).
// The output confirms what would be created so the caller can verify inputs.
func (ForeshadowingCreateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a foreshadowingCreateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	// Validate required fields.
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
	if a.PlantingChapter == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "planting_chapter is required"}},
			IsError: true,
		}, nil
	}
	if a.PlantingDescription == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "planting_description is required"}},
			IsError: true,
		}, nil
	}

	// Validate type enum.
	ft, ok := validForeshadowingTypes[a.Type]
	if !ok {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("invalid type %q: must be one of hint, prophecy, mystery, symbol, chekhov, red_herring", a.Type)}},
			IsError: true,
		}, nil
	}

	// Derive ID.
	id := a.ID
	if id == "" {
		id = foreshadowingSlugify(a.Name)
	}

	// Build the domain struct (in-memory only).
	f := &domain.Foreshadowing{
		ID:      id,
		Name:    a.Name,
		Type:    ft,
		Summary: a.Summary,
		Status:  domain.ForeshadowingStatusPlanted,
		Planting: domain.PlantingInfo{
			Chapter:     a.PlantingChapter,
			Description: a.PlantingDescription,
		},
	}

	if a.Importance != "" {
		if imp, ok := validForeshadowingImportances[a.Importance]; ok {
			f.Importance = &imp
		}
	}
	if a.PlannedResolutionChapter != "" {
		f.PlannedResolutionChapter = &a.PlannedResolutionChapter
	}

	// Serialize to JSON for the response body so callers can inspect the full struct.
	b, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "internal error: " + err.Error()}},
			IsError: true,
		}, nil
	}

	text := fmt.Sprintf("foreshadowing created: %s\n%s", id, string(b))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}
