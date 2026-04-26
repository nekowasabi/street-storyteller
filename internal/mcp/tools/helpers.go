package tools

import (
	"regexp"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

var nonAlphanumRe = regexp.MustCompile(`[^a-zA-Z0-9]+`)

// sanitizeID converts an arbitrary string into a lowercase snake_case identifier
// suitable for use as an auto-generated ID suffix.
func sanitizeID(s string) string {
	s = strings.ToLower(s)
	s = nonAlphanumRe.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	if len(s) > 20 {
		s = s[:20]
	}
	return s
}

// errResult builds an IsError CallToolResult with a single text block.
func errResult(msg string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		IsError: true,
	}
}
