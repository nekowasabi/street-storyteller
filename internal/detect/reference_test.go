package detect_test

import (
	"sort"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

// nameInfo is a single record describing how a name attaches to an entity.
type nameInfo struct {
	name   string
	source detect.MatchSource
	ref    detect.EntityRef
}

// mockCatalog is a test double satisfying both detect.EntityCatalog and the
// internal detailedCatalog (via DetectionHints method).
type mockCatalog struct {
	names []nameInfo
	// hints maps "kind/id" -> Hints
	hints map[string]detect.Hints
}

func (m *mockCatalog) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	for _, n := range m.names {
		if n.ref.Kind == kind && n.ref.ID == id {
			return n.ref, true
		}
	}
	return detect.EntityRef{}, false
}

func (m *mockCatalog) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	for _, n := range m.names {
		if n.name == name {
			return n.ref, n.source, true
		}
	}
	return detect.EntityRef{}, "", false
}

func (m *mockCatalog) ListNames(kind detect.EntityKind) []string {
	out := []string{}
	for _, n := range m.names {
		if n.ref.Kind == kind {
			out = append(out, n.name)
		}
	}
	return out
}

// DetectionHints satisfies the detect.detailedCatalog local interface.
func (m *mockCatalog) DetectionHints(kind detect.EntityKind, id string) (detect.Hints, bool) {
	h, ok := m.hints[string(kind)+"/"+id]
	return h, ok
}

// helper: build catalog from per-entity records.
type entityRecord struct {
	id           string
	kind         detect.EntityKind
	name         string
	displayNames []string
	aliases      []string
	pronouns     []string
	excludes     []string
}

func buildCatalog(records ...entityRecord) *mockCatalog {
	c := &mockCatalog{hints: map[string]detect.Hints{}}
	for _, r := range records {
		ref := detect.EntityRef{Kind: r.kind, ID: r.id}
		if r.name != "" {
			c.names = append(c.names, nameInfo{name: r.name, source: detect.SourceName, ref: ref})
		}
		for _, d := range r.displayNames {
			c.names = append(c.names, nameInfo{name: d, source: detect.SourceDisplayName, ref: ref})
		}
		for _, a := range r.aliases {
			c.names = append(c.names, nameInfo{name: a, source: detect.SourceAlias, ref: ref})
		}
		for _, p := range r.pronouns {
			c.names = append(c.names, nameInfo{name: p, source: detect.SourcePronoun, ref: ref})
		}
		c.hints[string(r.kind)+"/"+r.id] = detect.Hints{
			Pronouns:        r.pronouns,
			DisplayNames:    r.displayNames,
			Aliases:         r.aliases,
			ExcludePatterns: r.excludes,
		}
	}
	return c
}

func findFor(t *testing.T, results []detect.DetectedEntity, kind detect.EntityKind, id string) detect.DetectedEntity {
	t.Helper()
	for _, r := range results {
		if r.Entity.Kind == kind && r.Entity.ID == id {
			return r
		}
	}
	t.Fatalf("entity %s/%s not detected; got %+v", kind, id, results)
	return detect.DetectedEntity{}
}

func TestDetect_NameExactMatch(t *testing.T) {
	cat := buildCatalog(entityRecord{id: "hero", kind: detect.EntityCharacter, name: "勇者"})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "勇者は剣を抜いた", Catalog: cat,
	})
	got := findFor(t, res, detect.EntityCharacter, "hero")
	if got.Source != detect.SourceName || got.Score != 1.0 || got.MatchedText != "勇者" {
		t.Fatalf("want Name/1.0/勇者, got %+v", got)
	}
}

func TestDetect_DisplayName(t *testing.T) {
	cat := buildCatalog(entityRecord{
		id: "hero", kind: detect.EntityCharacter, name: "hero",
		displayNames: []string{"勇者", "主人公"},
	})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "主人公が現れた", Catalog: cat,
	})
	got := findFor(t, res, detect.EntityCharacter, "hero")
	if got.Source != detect.SourceDisplayName || got.Score != 0.9 || got.MatchedText != "主人公" {
		t.Fatalf("want DisplayName/0.9/主人公, got %+v", got)
	}
}

func TestDetect_Alias(t *testing.T) {
	cat := buildCatalog(entityRecord{
		id: "hero", kind: detect.EntityCharacter, name: "hero",
		aliases: []string{"勇", "H"},
	})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "勇は怒った", Catalog: cat,
	})
	got := findFor(t, res, detect.EntityCharacter, "hero")
	if got.Source != detect.SourceAlias || got.Score != 0.8 || got.MatchedText != "勇" {
		t.Fatalf("want Alias/0.8/勇, got %+v", got)
	}
}

func TestDetect_Pronoun(t *testing.T) {
	cat := buildCatalog(entityRecord{
		id: "hero", kind: detect.EntityCharacter, name: "hero",
		pronouns: []string{"彼"},
	})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "彼は走り出した", Catalog: cat,
	})
	got := findFor(t, res, detect.EntityCharacter, "hero")
	if got.Source != detect.SourcePronoun || got.Score != 0.6 || got.MatchedText != "彼" {
		t.Fatalf("want Pronoun/0.6/彼, got %+v", got)
	}
}

func TestDetect_FrontMatterBinding(t *testing.T) {
	cat := buildCatalog(
		entityRecord{id: "hero", kind: detect.EntityCharacter, name: "勇者"},
	)
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "（本文はこれだけ）", Catalog: cat,
		Bindings: map[detect.EntityKind][]string{
			detect.EntityCharacter: {"hero", "heroine"},
		},
	})
	hero := findFor(t, res, detect.EntityCharacter, "hero")
	if hero.Source != detect.SourceFrontMatter || hero.Score != 1.0 {
		t.Fatalf("hero: want FrontMatter/1.0, got %+v", hero)
	}
	heroine := findFor(t, res, detect.EntityCharacter, "heroine")
	if heroine.Source != detect.SourceFrontMatter || heroine.Score != 1.0 {
		t.Fatalf("heroine: want FrontMatter/1.0, got %+v", heroine)
	}
	// catalog miss should carry warning
	hasMissWarning := false
	for _, w := range heroine.Warnings {
		if w == "catalog_miss" {
			hasMissWarning = true
		}
	}
	if !hasMissWarning {
		t.Fatalf("heroine should carry catalog_miss warning; got %+v", heroine.Warnings)
	}
}

func TestDetect_DedupSameEntity(t *testing.T) {
	cat := buildCatalog(entityRecord{id: "hero", kind: detect.EntityCharacter, name: "勇者"})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "勇者勇者勇者", Catalog: cat,
	})
	count := 0
	for _, r := range res {
		if r.Entity.Kind == detect.EntityCharacter && r.Entity.ID == "hero" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("want 1 deduped candidate, got %d (%+v)", count, res)
	}
	hero := findFor(t, res, detect.EntityCharacter, "hero")
	if hero.Score != 1.0 {
		t.Fatalf("want highest score 1.0, got %v", hero.Score)
	}
	// Location should reference the FIRST byte offset (0).
	if hero.Location.Range.Start.Character != 0 {
		t.Fatalf("want first location at offset 0, got %+v", hero.Location)
	}
}

func TestDetect_Exclude(t *testing.T) {
	cat := buildCatalog(entityRecord{
		id: "hero", kind: detect.EntityCharacter, name: "勇者",
		excludes: []string{"勇者の歌"},
	})
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "勇者の歌が流れた", Catalog: cat,
	})
	for _, r := range res {
		if r.Entity.Kind == detect.EntityCharacter && r.Entity.ID == "hero" {
			t.Fatalf("expected no detection for excluded pattern, got %+v", r)
		}
	}
}

func TestDetect_FrontMatterUnknownID(t *testing.T) {
	cat := buildCatalog() // empty
	res := detect.Detect(detect.DetectionRequest{
		URI: "file:///c1.md", Content: "", Catalog: cat,
		Bindings: map[detect.EntityKind][]string{
			detect.EntityCharacter: {"unknown_id"},
		},
	})
	got := findFor(t, res, detect.EntityCharacter, "unknown_id")
	if got.Source != detect.SourceFrontMatter || got.Score != 1.0 {
		t.Fatalf("want FrontMatter/1.0, got %+v", got)
	}
	hasWarning := false
	for _, w := range got.Warnings {
		if w == "catalog_miss" {
			hasWarning = true
		}
	}
	if !hasWarning {
		t.Fatalf("want catalog_miss warning, got %+v", got.Warnings)
	}
}

// keep sort import used (defensive, remove if unused).
var _ = sort.Strings
