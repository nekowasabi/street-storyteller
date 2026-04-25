package detect_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

func TestPositionZeroValue(t *testing.T) {
	var p detect.Position
	if p.Line != 0 || p.Character != 0 {
		t.Fatalf("zero value not zero: %+v", p)
	}
}

func TestRangeUTF16ZeroValue(t *testing.T) {
	var r detect.RangeUTF16
	if r.Start.Line != 0 || r.End.Character != 0 {
		t.Fatalf("zero value not zero: %+v", r)
	}
}

func TestEntityKindConstants(t *testing.T) {
	cases := []detect.EntityKind{
		detect.EntityCharacter,
		detect.EntitySetting,
		detect.EntityForeshadowing,
		detect.EntityTimelineEvent,
		detect.EntityPhase,
		detect.EntityTimeline,
	}
	seen := map[detect.EntityKind]bool{}
	for _, c := range cases {
		if seen[c] {
			t.Fatalf("duplicate kind: %s", c)
		}
		seen[c] = true
	}
	if len(seen) != 6 {
		t.Fatalf("want 6 kinds, got %d", len(seen))
	}
}

// fakeCatalog は EntityCatalog の最小モック実装。
type fakeCatalog struct{}

func (fakeCatalog) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	return detect.EntityRef{Kind: kind, ID: id}, true
}

func (fakeCatalog) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	if name == "" {
		return detect.EntityRef{}, "", false
	}
	return detect.EntityRef{Kind: detect.EntityCharacter, ID: "fake"}, detect.SourceName, true
}

func (fakeCatalog) ListNames(kind detect.EntityKind) []string {
	return []string{"fake"}
}

func TestEntityCatalogInterface(t *testing.T) {
	var c detect.EntityCatalog = fakeCatalog{}
	if _, _, ok := c.FindByName("hero"); !ok {
		t.Fatal("FindByName should match non-empty name in fake")
	}
	if names := c.ListNames(detect.EntityCharacter); len(names) != 1 {
		t.Fatalf("want 1 name, got %d", len(names))
	}
}
