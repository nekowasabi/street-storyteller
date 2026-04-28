package providers

import (
	"context"
	"sort"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

const (
	SemanticTokenCharacter uint32 = iota
	SemanticTokenSetting
	SemanticTokenForeshadowing
)

const (
	SemanticModifierHighConfidence uint32 = 1 << iota
	SemanticModifierMediumConfidence
	SemanticModifierLowConfidence
	SemanticModifierPlanted
	SemanticModifierResolved
)

// SemanticTokens implements textDocument/semanticTokens/full for detected
// story entities in a document.
func SemanticTokens(
	_ context.Context,
	doc DocumentSnapshot,
	catalog detect.EntityCatalog,
) (*protocol.SemanticTokens, error) {
	if doc == nil || catalog == nil {
		return &protocol.SemanticTokens{Data: []uint32{}}, nil
	}
	detected := detect.Detect(detect.DetectionRequest{
		URI:     doc.URI(),
		Content: doc.Content(),
		Catalog: catalog,
	})
	sort.SliceStable(detected, func(i, j int) bool {
		a := detected[i].Location.Range.Start
		b := detected[j].Location.Range.Start
		if a.Line != b.Line {
			return a.Line < b.Line
		}
		return a.Character < b.Character
	})
	return &protocol.SemanticTokens{Data: encodeSemanticTokens(detected)}, nil
}

func encodeSemanticTokens(detected []detect.DetectedEntity) []uint32 {
	out := make([]uint32, 0, len(detected)*5)
	var prevLine, prevStart uint32
	for _, d := range detected {
		tokenType, ok := tokenTypeFor(d.Entity.Kind)
		if !ok {
			continue
		}
		start := d.Location.Range.Start
		end := d.Location.Range.End
		line := uint32(start.Line)
		character := uint32(start.Character)
		length := uint32(end.Character - start.Character)
		if length == 0 {
			continue
		}
		deltaLine := line - prevLine
		deltaStart := character
		if deltaLine == 0 {
			deltaStart = character - prevStart
		}
		out = append(out, deltaLine, deltaStart, length, tokenType, modifierFor(d))
		prevLine = line
		prevStart = character
	}
	return out
}

func tokenTypeFor(kind detect.EntityKind) (uint32, bool) {
	switch kind {
	case detect.EntityCharacter:
		return SemanticTokenCharacter, true
	case detect.EntitySetting:
		return SemanticTokenSetting, true
	case detect.EntityForeshadowing:
		return SemanticTokenForeshadowing, true
	default:
		return 0, false
	}
}

func modifierFor(d detect.DetectedEntity) uint32 {
	switch {
	case d.Score >= 0.85:
		return SemanticModifierHighConfidence
	case d.Score >= 0.7:
		return SemanticModifierMediumConfidence
	default:
		return SemanticModifierLowConfidence
	}
}
