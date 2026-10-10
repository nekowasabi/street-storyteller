package providers

import (
	"context"
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

func repeatedReferenceCatalog() fakeCatalog {
	return fakeCatalog{
		names: map[detect.EntityKind][]string{detect.EntityCharacter: {"勇者"}},
		byName: map[string]struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{
			"勇者": {detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourceName},
		},
	}
}

func TestLSPResolvesEveryRepeatedReference(t *testing.T) {
	cat := repeatedReferenceCatalog()
	doc := fakeDoc{uri: "file:///chapter.md", content: "勇者、勇者\n😀勇者"}
	lookup := fakeLookup{infos: map[string]EntityInfo{"hero": {Name: "勇者", Kind: "character", Summary: "主人公"}}}
	locator := fakeLocator{locs: map[string]protocol.Location{"hero": {URI: "file:///hero.ts"}}}
	for _, pos := range []protocol.Position{{Line: 0, Character: 1}, {Line: 0, Character: 4}, {Line: 1, Character: 3}} {
		hover, err := Hover(context.Background(), doc, pos, cat, lookup)
		if err != nil || hover == nil {
			t.Errorf("hover at %+v: %v, %v", pos, hover, err)
		}
		defs, err := Definition(context.Background(), doc, pos, cat, locator)
		if err != nil || len(defs) != 1 {
			t.Errorf("definition at %+v: %v, %v", pos, defs, err)
		}
	}
}

func TestSemanticTokensIncludeEveryRepeatedReference(t *testing.T) {
	got, err := SemanticTokens(context.Background(), fakeDoc{uri: "file:///chapter.md", content: "勇者、勇者\n😀勇者"}, repeatedReferenceCatalog())
	if err != nil {
		t.Fatal(err)
	}
	want := []uint32{0, 0, 2, SemanticTokenCharacter, SemanticModifierHighConfidence, 0, 3, 2, SemanticTokenCharacter, SemanticModifierHighConfidence, 1, 2, 2, SemanticTokenCharacter, SemanticModifierHighConfidence}
	if !reflect.DeepEqual(got.Data, want) {
		t.Fatalf("got %v, want %v", got.Data, want)
	}
}

func TestOccurrenceDetectionKeepsDefaultEntityAggregation(t *testing.T) {
	cat := repeatedReferenceCatalog()
	cat.names[detect.EntityCharacter] = []string{"勇者", "彼", "勇者"}
	cat.byName["彼"] = struct {
		ref detect.EntityRef
		src detect.MatchSource
	}{detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourcePronoun}
	req := detect.DetectionRequest{Content: "勇者、彼、勇者", Catalog: cat}
	if got := detect.Detect(req); len(got) != 1 || got[0].Score != 1 {
		t.Fatalf("default aggregation changed: %+v", got)
	}
	req.KeepOccurrences = true
	got := detect.Detect(req)
	if len(got) != 3 {
		t.Fatalf("want 3 distinct occurrences despite duplicate catalog name, got %+v", got)
	}
	for _, d := range got {
		if d.MatchedText == "彼" && (d.Source != detect.SourcePronoun || d.Score != 0.6) {
			t.Fatalf("pronoun confidence changed: %+v", d)
		}
	}
}

func TestRepeatedSemanticTokensDoNotOverlapAliases(t *testing.T) {
	cat := repeatedReferenceCatalog()
	cat.names[detect.EntityCharacter] = []string{"勇", "者", "勇者"}
	for _, name := range []string{"勇", "者"} {
		cat.byName[name] = struct {
			ref detect.EntityRef
			src detect.MatchSource
		}{detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourceAlias}
	}
	got, err := SemanticTokens(context.Background(), fakeDoc{uri: "file:///chapter.md", content: "勇者、勇者"}, cat)
	if err != nil {
		t.Fatal(err)
	}
	want := []uint32{0, 0, 2, SemanticTokenCharacter, SemanticModifierHighConfidence, 0, 3, 2, SemanticTokenCharacter, SemanticModifierHighConfidence}
	if !reflect.DeepEqual(got.Data, want) {
		t.Fatalf("overlapping alias tokens: got %v, want %v", got.Data, want)
	}
}

func TestDefinitionOverlappingAliasesReturnsOneEntity(t *testing.T) {
	cat := repeatedReferenceCatalog()
	cat.names[detect.EntityCharacter] = []string{"勇者", "勇"}
	cat.byName["勇"] = struct {
		ref detect.EntityRef
		src detect.MatchSource
	}{detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourceAlias}
	got, err := Definition(context.Background(), fakeDoc{uri: "file:///chapter.md", content: "勇者、勇者"}, protocol.Position{Line: 0, Character: 3}, cat, fakeLocator{locs: map[string]protocol.Location{"hero": {URI: "file:///hero.ts"}}})
	if err != nil || len(got) != 1 {
		t.Fatalf("duplicate alias definitions: %+v, %v", got, err)
	}
}
