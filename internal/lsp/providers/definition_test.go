package providers

import (
	"context"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

type fakeLocator struct {
	locs map[string]protocol.Location
}

func (f fakeLocator) Locate(ref detect.EntityRef) (protocol.Location, bool) {
	loc, ok := f.locs[ref.ID]
	return loc, ok
}

func TestDefinition_OnEntityReference_ReturnsLocation(t *testing.T) {
	cat := fakeCatalog{
		names: map[detect.EntityKind][]string{
			detect.EntityCharacter: {"勇者"},
		},
		byID: map[string]detect.EntityRef{
			"hero": {Kind: detect.EntityCharacter, ID: "hero"},
		},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{
			"勇者": {
				ref: detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"},
				src: detect.SourceName,
			},
		},
	}
	want := protocol.Location{
		URI: "file:///characters/hero.go",
		Range: protocol.Range{
			Start: protocol.Position{Line: 10, Character: 0},
			End:   protocol.Position{Line: 10, Character: 5},
		},
	}
	loc := fakeLocator{locs: map[string]protocol.Location{"hero": want}}
	doc := fakeDoc{uri: "file:///m.md", content: "勇者は剣を抜いた。"}
	pos := protocol.Position{Line: 0, Character: 1}

	got, err := Definition(context.Background(), doc, pos, cat, loc)
	if err != nil {
		t.Fatalf("Definition error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len(got) = %d, want 1", len(got))
	}
	if got[0].URI != want.URI {
		t.Errorf("URI = %q, want %q", got[0].URI, want.URI)
	}
}

func TestDefinition_NoMatch_ReturnsEmpty(t *testing.T) {
	cat := fakeCatalog{
		names:  map[detect.EntityKind][]string{},
		byID:   map[string]detect.EntityRef{},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{},
	}
	loc := fakeLocator{locs: map[string]protocol.Location{}}
	doc := fakeDoc{uri: "file:///m.md", content: "こんにちは"}
	pos := protocol.Position{Line: 0, Character: 1}

	got, err := Definition(context.Background(), doc, pos, cat, loc)
	if err != nil {
		t.Fatalf("Definition error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("len(got) = %d, want 0", len(got))
	}
}
