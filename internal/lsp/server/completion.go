package server

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

const (
	completionKindValue = 12
	completionKindEnum  = 13
)

func (s *Server) handleCompletion(_ context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.CompletionParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeInvalidParams,
			Message: "completion: " + err.Error(),
		}
	}
	content, ok := s.docs.Get(p.TextDocument.URI)
	if !ok {
		return protocol.CompletionList{Items: []protocol.CompletionItem{}}, nil
	}
	items := clarityCompletions(content, p.Position, s.propositions)
	debugf(s.debug, "completion uri=%q line=%d character=%d items=%d", p.TextDocument.URI, p.Position.Line, p.Position.Character, len(items))
	return protocol.CompletionList{Items: items}, nil
}

// clarityCompletions offers proposition ids and stances on a frontmatter
// list item under reader_shows / reader_requires. Outside those lists it
// returns nothing, so the manuscript body is never polluted with candidates.
func clarityCompletions(content string, pos protocol.Position, propIDs []string) []protocol.CompletionItem {
	lines := strings.Split(content, "\n")
	if int(pos.Line) >= len(lines) || !inFrontMatter(lines, int(pos.Line)) {
		return []protocol.CompletionItem{}
	}
	key := enclosingListKey(lines, int(pos.Line))
	if key != "reader_shows" && key != "reader_requires" {
		return []protocol.CompletionItem{}
	}
	line := lines[pos.Line]
	cut, err := detect.NewPositionTable(line).ByteOffset(0, int(pos.Character))
	if err != nil {
		cut = len(line)
	}
	before := strings.TrimSpace(line[:cut])
	if !strings.HasPrefix(before, "-") {
		return []protocol.CompletionItem{}
	}
	entry := strings.Trim(strings.TrimSpace(strings.TrimPrefix(before, "-")), "\"'")

	items := []protocol.CompletionItem{}
	if id, rest, hasColon := strings.Cut(entry, ":"); hasColon {
		for _, st := range domain.AllStances {
			if strings.HasPrefix(string(st), rest) {
				items = append(items, protocol.CompletionItem{Label: string(st), Kind: completionKindEnum, Detail: id + ":" + string(st)})
			}
		}
		return items
	}
	for _, id := range propIDs {
		if strings.HasPrefix(id, entry) {
			items = append(items, protocol.CompletionItem{Label: id, Kind: completionKindValue, Detail: "proposition"})
		}
	}
	return items
}

// inFrontMatter reports whether line sits between the opening "---" and the
// closing "---" of the document's frontmatter.
func inFrontMatter(lines []string, line int) bool {
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" || line == 0 {
		return false
	}
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			return line < i
		}
	}
	return false
}

// enclosingListKey walks upward from line to the nearest "  key:" line.
func enclosingListKey(lines []string, line int) string {
	for i := line; i >= 0; i-- {
		l := lines[i]
		if strings.HasPrefix(l, "  ") && !strings.HasPrefix(l, "   ") {
			key, _, _ := strings.Cut(strings.TrimSpace(l), ":")
			return key
		}
	}
	return ""
}
