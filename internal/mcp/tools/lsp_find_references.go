package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/project"
)

// LSPFindReferencesTool searches manuscript files for references to a named entity.
type LSPFindReferencesTool struct{}

type lspFindReferencesArgs struct {
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	Root       string `json:"root"`
}

// Definition advertises the lsp_find_references schema.
func (LSPFindReferencesTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "lsp_find_references",
		Description: "Find all manuscript references to a character or setting entity",
		InputSchema: json.RawMessage(`{
"type":"object",
"properties":{
  "entity_type":{"type":"string","enum":["character","setting"]},
  "entity_id":{"type":"string"},
  "root":{"type":"string","description":"manuscripts directory; defaults to <project>/manuscripts"}
},
"required":["entity_type","entity_id"]
}`),
	}
}

// Handle searches manuscripts for references to the named entity.
//
// Why: separate name-collection from file-scanning so each concern is testable
// independently; the scan itself is a plain strings.Contains loop because
// storyteller entity names are short strings without regex special chars.
func (LSPFindReferencesTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a lspFindReferencesArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	// --- validate required args ---
	if a.EntityType == "" {
		return strErrorResult("entity_type is required"), nil
	}
	if a.EntityID == "" {
		return strErrorResult("entity_id is required"), nil
	}
	if a.EntityType != "character" && a.EntityType != "setting" {
		return strErrorResult("entity_type must be \"character\" or \"setting\""), nil
	}

	// --- load project ---
	proj, err := project.Load(ec.ProjectRoot)
	if err != nil {
		return strErrorResult(err.Error()), nil
	}

	// --- resolve entity names ---
	names, err := resolveEntityNames(proj, a.EntityType, a.EntityID)
	if err != nil {
		return strErrorResult(err.Error()), nil
	}

	// --- determine manuscripts root ---
	manuscriptsRoot := a.Root
	if manuscriptsRoot == "" {
		manuscriptsRoot = filepath.Join(ec.ProjectRoot, "manuscripts")
	}

	// --- scan files ---
	refs, err := scanForReferences(manuscriptsRoot, names)
	if err != nil {
		return strErrorResult(err.Error()), nil
	}

	// --- format output ---
	text := formatReferences(refs)
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: text}},
	}, nil
}

// reference holds a single match position.
type reference struct {
	file    string
	line    int
	content string
}

// resolveEntityNames returns the canonical name + displayNames for the entity.
func resolveEntityNames(proj *project.Project, entityType, entityID string) ([]string, error) {
	switch entityType {
	case "character":
		c, err := proj.Store.Character(entityID)
		if err != nil {
			return nil, fmt.Errorf("character %q not found", entityID)
		}
		names := []string{c.Name}
		names = append(names, c.DisplayNames...)
		return dedup(names), nil
	case "setting":
		s, err := proj.Store.Setting(entityID)
		if err != nil {
			return nil, fmt.Errorf("setting %q not found", entityID)
		}
		names := []string{s.Name}
		names = append(names, s.DisplayNames...)
		return dedup(names), nil
	default:
		return nil, fmt.Errorf("unsupported entity_type: %s", entityType)
	}
}

// dedup removes empty strings and duplicate values while preserving order.
func dedup(in []string) []string {
	seen := make(map[string]bool)
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

// scanForReferences walks manuscriptsRoot recursively, collecting lines that
// contain any of the given names.
//
// Why strings.Contains rather than regex: entity names are plain strings;
// regex overhead is unnecessary and could introduce false negatives if names
// contain regex metacharacters.
func scanForReferences(root string, names []string) ([]reference, error) {
	var refs []reference

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, werr error) error {
		if werr != nil {
			// Skip unreadable entries without aborting the whole walk.
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".md") {
			return nil
		}

		fileRefs, err := scanFile(path, names)
		if err != nil {
			// Non-fatal: skip unreadable files.
			return nil
		}
		refs = append(refs, fileRefs...)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return refs, nil
}

// scanFile scans a single file line by line and returns matches.
func scanFile(path string, names []string) ([]reference, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var refs []reference
	scanner := bufio.NewScanner(f)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		for _, name := range names {
			if strings.Contains(line, name) {
				refs = append(refs, reference{
					file:    path,
					line:    lineNum,
					content: strings.TrimSpace(line),
				})
				break // one match per line is enough
			}
		}
	}
	return refs, scanner.Err()
}

// formatReferences builds the human-readable result string.
func formatReferences(refs []reference) string {
	count := len(refs)
	if count == 0 {
		return "0 references found"
	}
	var sb strings.Builder
	fmt.Fprintf(&sb, "%d references found:\n", count)
	for _, r := range refs {
		fmt.Fprintf(&sb, "%s:%d: %s\n", r.file, r.line, r.content)
	}
	return strings.TrimRight(sb.String(), "\n")
}

// strErrorResult constructs an IsError CallToolResult with the given message.
// Why: errorResult in view_browser.go accepts error; using a distinct name
// avoids a package-level redeclaration conflict.
func strErrorResult(msg string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		IsError: true,
	}
}
