package providers

import (
	"context"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

func TestSemanticTokens_CharacterReference(t *testing.T) {
	cat := fakeCatalog{
		names: map[detect.EntityKind][]string{
			detect.EntityCharacter: {"シンデレラ"},
		},
		byID: map[string]detect.EntityRef{
			"cinderella": {Kind: detect.EntityCharacter, ID: "cinderella"},
		},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{
			"シンデレラ": {
				ref: detect.EntityRef{Kind: detect.EntityCharacter, ID: "cinderella"},
				src: detect.SourceName,
			},
		},
	}
	got, err := SemanticTokens(context.Background(), fakeDoc{
		uri:     "file:///chapter.md",
		content: "シンデレラは走った。",
	}, cat)
	if err != nil {
		t.Fatalf("SemanticTokens error: %v", err)
	}
	want := []uint32{0, 0, 5, SemanticTokenCharacter, SemanticModifierHighConfidence}
	if len(got.Data) != len(want) {
		t.Fatalf("data length = %d, want %d: %v", len(got.Data), len(want), got.Data)
	}
	for i := range want {
		if got.Data[i] != want[i] {
			t.Fatalf("data[%d] = %d, want %d; all=%v", i, got.Data[i], want[i], got.Data)
		}
	}
}

func TestSemanticTokens_AliasUsesMediumConfidenceModifier(t *testing.T) {
	cat := fakeCatalog{
		names: map[detect.EntityKind][]string{
			detect.EntityCharacter: {"姫"},
		},
		byID: map[string]detect.EntityRef{
			"cinderella": {Kind: detect.EntityCharacter, ID: "cinderella"},
		},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{
			"姫": {
				ref: detect.EntityRef{Kind: detect.EntityCharacter, ID: "cinderella"},
				src: detect.SourceAlias,
			},
		},
	}
	got, err := SemanticTokens(context.Background(), fakeDoc{
		uri:     "file:///chapter.md",
		content: "姫は走った。",
	}, cat)
	if err != nil {
		t.Fatalf("SemanticTokens error: %v", err)
	}
	if len(got.Data) != 5 {
		t.Fatalf("data = %v, want one token", got.Data)
	}
	if got.Data[4] != SemanticModifierMediumConfidence {
		t.Fatalf("modifier = %d, want medium (%d); data=%v", got.Data[4], SemanticModifierMediumConfidence, got.Data)
	}
}
