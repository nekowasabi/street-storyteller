package providers

import (
	"context"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// fakeDoc is a minimal DocumentSnapshot for tests.
type fakeDoc struct {
	uri, content string
}

func (f fakeDoc) URI() string     { return f.uri }
func (f fakeDoc) Content() string { return f.content }

// fakeCatalog implements detect.EntityCatalog with a fixed single-name table.
type fakeCatalog struct {
	names map[detect.EntityKind][]string
	byID  map[string]detect.EntityRef
	// byName maps name → ref + match source.
	byName map[string]struct {
		ref detect.EntityRef
		src detect.MatchSource
	}
}

func (c fakeCatalog) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	r, ok := c.byID[id]
	return r, ok
}

func (c fakeCatalog) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	if c.byName == nil {
		return detect.EntityRef{}, "", false
	}
	v, ok := c.byName[name]
	if !ok {
		return detect.EntityRef{}, "", false
	}
	return v.ref, v.src, true
}

func (c fakeCatalog) ListNames(kind detect.EntityKind) []string {
	return c.names[kind]
}

// fakeLookup implements EntityLookup.
type fakeLookup struct {
	infos map[string]EntityInfo
}

func (l fakeLookup) Lookup(ref detect.EntityRef) (EntityInfo, bool) {
	info, ok := l.infos[ref.ID]
	return info, ok
}

func TestHover_OnEntityReference_ReturnsMarkdown(t *testing.T) {
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
	lookup := fakeLookup{
		infos: map[string]EntityInfo{
			"hero": {Name: "勇者", Kind: "character", Summary: "主人公"},
		},
	}
	doc := fakeDoc{uri: "file:///m.md", content: "勇者は剣を抜いた。"}
	pos := protocol.Position{Line: 0, Character: 1} // inside 勇者 (UTF-16 chars 0..2)

	got, err := Hover(context.Background(), doc, pos, cat, lookup)
	if err != nil {
		t.Fatalf("Hover returned error: %v", err)
	}
	if got == nil {
		t.Fatalf("Hover returned nil, want HoverResult")
	}
	if got.Contents.Kind != "markdown" {
		t.Errorf("Contents.Kind = %q, want %q", got.Contents.Kind, "markdown")
	}
	if !strings.Contains(got.Contents.Value, "**勇者** (character)") {
		t.Errorf("Value missing header: %q", got.Contents.Value)
	}
	if !strings.Contains(got.Contents.Value, "主人公") {
		t.Errorf("Value missing summary: %q", got.Contents.Value)
	}
}

func TestHover_NoMatch_ReturnsNil(t *testing.T) {
	cat := fakeCatalog{
		names: map[detect.EntityKind][]string{},
		byID:  map[string]detect.EntityRef{},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{},
	}
	lookup := fakeLookup{infos: map[string]EntityInfo{}}
	doc := fakeDoc{uri: "file:///m.md", content: "こんにちは"}
	pos := protocol.Position{Line: 0, Character: 1}

	got, err := Hover(context.Background(), doc, pos, cat, lookup)
	if err != nil {
		t.Fatalf("Hover returned error: %v", err)
	}
	if got != nil {
		t.Errorf("Hover returned %+v, want nil", got)
	}
}
