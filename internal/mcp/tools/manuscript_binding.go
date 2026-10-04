package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/meta"
	"github.com/takets/street-storyteller/internal/project"
)

// ManuscriptBindingTool manages YAML frontmatter entity bindings in manuscript files.
type ManuscriptBindingTool struct{}

type manuscriptBindingArgs struct {
	Manuscript string   `json:"manuscript"`
	Action     string   `json:"action"`
	EntityType string   `json:"entityType"`
	IDs        []string `json:"ids"`
	Validate   *bool    `json:"validate"`
}

// Definition advertises the manuscript_binding schema.
func (ManuscriptBindingTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "manuscript_binding",
		Description: "Add, remove, or replace entity ID lists in a manuscript YAML frontmatter (characters, settings, foreshadowings, timeline_events, phases, timelines).",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["manuscript", "action", "entityType", "ids"],
			"properties": {
				"manuscript":  {"type": "string", "description": "Absolute or project-relative path to the manuscript .md file"},
				"action":      {"type": "string", "enum": ["add", "remove", "set"]},
				"entityType":  {"type": "string", "enum": ["characters", "settings", "foreshadowings", "timeline_events", "phases", "timelines"]},
				"ids":         {"type": "array", "items": {"type": "string"}},
				"validate":    {"type": "boolean", "description": "When true (default), verify each ID exists in the project store"}
			}
		}`),
	}
}

// Handle applies the binding mutation and writes the updated manuscript.
func (ManuscriptBindingTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a manuscriptBindingArgs
	if err := json.Unmarshal(args, &a); err != nil {
		return bindingErrorResult("invalid arguments: " + err.Error()), nil
	}

	// --- validate required fields ---
	if a.Manuscript == "" {
		return bindingErrorResult("manuscript is required"), nil
	}
	if a.Action == "" {
		return bindingErrorResult("action is required"), nil
	}
	if a.EntityType == "" {
		return bindingErrorResult("entityType is required"), nil
	}

	validActions := map[string]bool{"add": true, "remove": true, "set": true}
	if !validActions[a.Action] {
		return bindingErrorResult("action must be one of: add, remove, set"), nil
	}

	validEntityTypes := map[string]bool{
		"characters": true, "settings": true, "foreshadowings": true,
		"timeline_events": true, "phases": true, "timelines": true,
	}
	if !validEntityTypes[a.EntityType] {
		return bindingErrorResult("entityType must be one of: characters, settings, foreshadowings, timeline_events, phases, timelines"), nil
	}

	// --- resolve manuscript path ---
	manuscriptPath := a.Manuscript
	if !filepath.IsAbs(manuscriptPath) {
		manuscriptPath = filepath.Join(ec.ProjectRoot, manuscriptPath)
	}

	// --- read manuscript ---
	content, err := os.ReadFile(manuscriptPath)
	if err != nil {
		return bindingErrorResult("cannot read manuscript: " + err.Error()), nil
	}

	// --- validate IDs if requested ---
	shouldValidate := a.Validate == nil || *a.Validate
	if shouldValidate && len(a.IDs) > 0 {
		if err := validateIDs(ec.ProjectRoot, a.EntityType, a.IDs); err != nil {
			return bindingErrorResult(err.Error()), nil
		}
	}

	// --- parse and update frontmatter ---
	updated, err := updateFrontmatter(string(content), a.EntityType, a.Action, a.IDs)
	if err != nil {
		return bindingErrorResult("frontmatter error: " + err.Error()), nil
	}

	// --- write back ---
	if err := os.WriteFile(manuscriptPath, []byte(updated), 0o644); err != nil {
		return bindingErrorResult("cannot write manuscript: " + err.Error()), nil
	}

	msg := fmt.Sprintf("manuscript binding updated: action=%s entity=%s ids=%s",
		a.Action, a.EntityType, strings.Join(a.IDs, ","))
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
	}, nil
}

// bindingErrorResult wraps a message as an MCP tool error response.
// Why: named distinctly from view_browser.go's errorResult(error) to avoid collision
// in the same package while keeping a local helper.
func bindingErrorResult(msg string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		IsError: true,
	}
}

// validateIDs checks each id exists in the project store for the given entityType.
// Why: project.Load is the single source of truth; using it avoids duplicating
// path-resolution logic that already lives in the project package.
func validateIDs(projectRoot, entityType string, ids []string) error {
	proj, err := project.Load(projectRoot)
	if err != nil {
		// If the project cannot be loaded (e.g. no manifest), skip validation
		// rather than blocking the user. validate=true only makes sense when
		// a full project is present.
		return nil
	}

	var missing []string
	for _, id := range ids {
		if !idExists(proj, entityType, id) {
			missing = append(missing, id)
		}
	}
	if len(missing) > 0 {
		return apperrors.New(apperrors.CodeNotFound,
			fmt.Sprintf("unknown %s IDs: %s", entityType, strings.Join(missing, ", ")))
	}
	return nil
}

// idExists returns true when id is found in the store for the given entityType.
func idExists(proj *project.Project, entityType, id string) bool {
	switch entityType {
	case "characters":
		_, err := proj.Store.Character(id)
		return err == nil
	case "settings":
		_, err := proj.Store.Setting(id)
		return err == nil
	case "foreshadowings":
		_, err := proj.Store.Foreshadowing(id)
		return err == nil
	case "timelines":
		_, err := proj.Store.Timeline(id)
		return err == nil
	case "phases":
		_, err := proj.Store.CharacterPhase(id)
		return err == nil
	case "timeline_events":
		// Events are nested inside Timelines; scan all timelines.
		for _, tl := range proj.Store.AllTimelines() {
			for _, ev := range tl.Events {
				if ev.ID == id {
					return true
				}
			}
		}
		return false
	}
	return false
}

// updateFrontmatter parses the YAML frontmatter from content, applies the
// action to the entityType field, and returns the reconstructed document.
//
// Why hand-written parser instead of a YAML library: no yaml dependency exists
// in go.mod and adding one for this limited use case (list field read/write)
// is heavier than a small dedicated parser.
func updateFrontmatter(content, entityType, action string, ids []string) (string, error) {
	fm, body, hasFM := meta.SplitFrontmatter(content)

	// Parse the relevant list field from frontmatter.
	current := meta.ParseList(fm, entityType)

	// Apply action.
	var next []string
	switch action {
	case "add":
		next = mergeUnique(current, ids)
	case "remove":
		next = removeAll(current, ids)
	case "set":
		next = ids
	}

	// Rebuild the frontmatter with the updated field.
	fm = setFMList(fm, entityType, next)

	if hasFM {
		return "---\n" + fm + "---\n" + body, nil
	}
	return "---\n" + fm + "---\n" + body, nil
}

// setFMList rewrites the entityType list in the frontmatter string, replacing
// or inserting as needed, and returns the updated frontmatter text.
func setFMList(fm, key string, ids []string) string {
	lines := strings.Split(fm, "\n")
	var out []string
	skip := false

	replaced := false
	for _, line := range lines {
		if skip {
			stripped := strings.TrimSpace(line)
			if strings.HasPrefix(stripped, "- ") {
				continue // skip old list items
			}
			skip = false
			// This line is a new top-level key — fall through.
		}

		prefix := key + ":"
		if strings.HasPrefix(strings.TrimSpace(line), prefix) {
			// Keep the key under its parent. Column 0 would leave storyteller:.
			indent := leadingSpace(line)
			out = append(out, indent+key+":")
			for _, id := range ids {
				out = append(out, indent+"  - "+id)
			}
			skip = true
			replaced = true
			continue
		}
		if line != "" || !skip {
			out = append(out, line)
		}
	}

	if !replaced {
		// Key did not exist — append it.
		// Remove trailing empty line if present.
		for len(out) > 0 && out[len(out)-1] == "" {
			out = out[:len(out)-1]
		}
		out = append(out, key+":")
		for _, id := range ids {
			out = append(out, "  - "+id)
		}
		out = append(out, "")
	}

	return strings.Join(out, "\n")
}

func leadingSpace(line string) string {
	i := 0
	for i < len(line) && (line[i] == ' ' || line[i] == '\t') {
		i++
	}
	return line[:i]
}

// mergeUnique appends newItems to existing, skipping duplicates, preserving order.
func mergeUnique(existing, newItems []string) []string {
	seen := make(map[string]bool, len(existing))
	for _, v := range existing {
		seen[v] = true
	}
	result := make([]string, len(existing))
	copy(result, existing)
	for _, v := range newItems {
		if !seen[v] {
			result = append(result, v)
			seen[v] = true
		}
	}
	return result
}

// removeAll returns existing with all items in toRemove deleted.
func removeAll(existing, toRemove []string) []string {
	drop := make(map[string]bool, len(toRemove))
	for _, v := range toRemove {
		drop[v] = true
	}
	var result []string
	for _, v := range existing {
		if !drop[v] {
			result = append(result, v)
		}
	}
	return result
}
