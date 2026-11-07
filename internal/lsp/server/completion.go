package server

import (
	"context"
	"encoding/json"
	"strings"
	"unicode/utf16"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
	"github.com/takets/street-storyteller/internal/lsp/providers"
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

// clarityEntryAt reads the reader_shows / reader_requires list item under
// pos ("- \"S08:shown\"") and reports its proposition id and stance.
// onStance tells whether pos sits after the colon.
func clarityEntryAt(content string, pos protocol.Position) (id, stance string, onStance, ok bool) {
	lines := strings.Split(content, "\n")
	ln := int(pos.Line)
	if ln >= len(lines) {
		return "", "", false, false
	}
	id, stance, start, end, ok := clarityEntryOnLine(lines, ln)
	if !ok {
		return "", "", false, false
	}
	cur, err := detect.NewPositionTable(strings.TrimRight(lines[ln], "\r")).ByteOffset(0, int(pos.Character))
	if err != nil || cur < start || cur > end {
		return "", "", false, false
	}
	return id, stance, cur > start+len(id), true
}

// clarityEntryOnLine parses lines[ln] as a reader_* list item and returns
// the entry with its byte span. Only the block form ("- \"id:stance\"") is read.
func clarityEntryOnLine(lines []string, ln int) (id, stance string, start, end int, ok bool) {
	if !inFrontMatter(lines, ln) {
		return "", "", 0, 0, false
	}
	if key := enclosingListKey(lines, ln); key != "reader_shows" && key != "reader_requires" {
		return "", "", 0, 0, false
	}
	line := strings.TrimRight(lines[ln], "\r")
	dash := strings.Index(line, "-")
	if dash < 0 || strings.TrimSpace(line[:dash]) != "" {
		return "", "", 0, 0, false
	}
	start, end = dash+1, len(line)
	for start < end && strings.ContainsRune(" \t\"'", rune(line[start])) {
		start++
	}
	for end > start && strings.ContainsRune(" \t\"',", rune(line[end-1])) {
		end--
	}
	if start >= end {
		return "", "", 0, 0, false
	}
	id, stance, _ = strings.Cut(line[start:end], ":")
	return id, stance, start, end, id != ""
}

func (s *Server) handleInlayHint(_ context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.InlayHintParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{Code: protocol.CodeInvalidParams, Message: "inlayHint: " + err.Error()}
	}
	content, ok := s.docs.Get(p.TextDocument.URI)
	if !ok || s.lookup == nil {
		return []protocol.InlayHint{}, nil
	}
	return clarityInlayHints(content, s.lookup), nil
}

// clarityInlayHints labels each reader_* entry with its proposition's
// statement, so "S08:shown" reads as a sentence without hovering.
func clarityInlayHints(content string, lookup providers.EntityLookup) []protocol.InlayHint {
	hints := []protocol.InlayHint{}
	lines := strings.Split(content, "\n")
	for ln := range lines {
		id, _, _, _, ok := clarityEntryOnLine(lines, ln)
		if !ok {
			continue
		}
		info, found := lookup.Lookup(detect.EntityRef{Kind: detect.EntityProposition, ID: id})
		if !found || info.Summary == "" {
			continue
		}
		line := strings.TrimRight(lines[ln], "\r")
		hints = append(hints, protocol.InlayHint{
			Position:    protocol.Position{Line: uint32(ln), Character: uint32(len(utf16.Encode([]rune(line))))},
			Label:       info.Summary,
			PaddingLeft: true,
		})
	}
	return hints
}

func (s *Server) clarityHover(content string, pos protocol.Position) *protocol.HoverResult {
	id, stance, onStance, ok := clarityEntryAt(content, pos)
	if !ok {
		return nil
	}
	var value string
	if onStance {
		meaning, known := domain.StanceMeanings[domain.Stance(stance)]
		if !known {
			return nil
		}
		value = "**" + stance + "** (stance)\n\n" + meaning
	} else {
		if s.lookup == nil {
			return nil
		}
		info, found := s.lookup.Lookup(detect.EntityRef{Kind: detect.EntityProposition, ID: id})
		if !found {
			return nil
		}
		value = "**" + info.Name + "** (" + info.Kind + ")\n\n" + info.Summary
	}
	return &protocol.HoverResult{Contents: protocol.MarkupContent{Kind: "markdown", Value: value}}
}

func (s *Server) clarityDefinition(content string, pos protocol.Position) (protocol.Location, bool) {
	// The stance has no definition of its own, so the whole entry jumps to its proposition.
	id, _, _, ok := clarityEntryAt(content, pos)
	if !ok || s.locator == nil {
		return protocol.Location{}, false
	}
	return s.locator.Locate(detect.EntityRef{Kind: detect.EntityProposition, ID: id})
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
