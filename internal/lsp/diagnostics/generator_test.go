package diagnostics

import (
	"context"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

func TestStorytellerSource_SeverityMapping_LowConfidence_Warning(t *testing.T) {
	// alias score = 0.8 → Warning (sev 2)
	if got := severityFor(0.8); got != severityWarning {
		t.Errorf("severityFor(0.8) = %d, want %d (Warning)", got, severityWarning)
	}
	// displayName score = 0.9 → no diagnostic
	if got := severityFor(0.9); got != 0 {
		t.Errorf("severityFor(0.9) = %d, want 0 (no diagnostic)", got)
	}
}

func TestStorytellerSource_SeverityMapping_VeryLow_Error(t *testing.T) {
	// pronoun score = 0.6 → Error (sev 1)
	if got := severityFor(0.6); got != severityError {
		t.Errorf("severityFor(0.6) = %d, want %d (Error)", got, severityError)
	}
}

// stubSource emits a fixed list of diagnostics, used to verify Aggregator merging.
type stubSource struct {
	name  string
	diags []protocol.Diagnostic
}

func (s *stubSource) Name() string { return s.name }
func (s *stubSource) Generate(_ context.Context, _ string, _ string) ([]protocol.Diagnostic, error) {
	return s.diags, nil
}

func TestAggregator_MergesMultipleSources(t *testing.T) {
	a := &Aggregator{
		Sources: []DiagnosticSource{
			&stubSource{name: "src1", diags: []protocol.Diagnostic{
				{Message: "a", Source: "src1"},
			}},
			&stubSource{name: "src2", diags: []protocol.Diagnostic{
				{Message: "b", Source: "src2"},
				{Message: "c", Source: "src2"},
			}},
		},
	}
	got, err := a.Generate(context.Background(), "file:///x.md", "")
	if err != nil {
		t.Fatalf("Generate error: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("len(got) = %d, want 3", len(got))
	}
}

type pronounCatalog struct{}

func (pronounCatalog) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	if kind == detect.EntityCharacter && id == "hero" {
		return detect.EntityRef{Kind: kind, ID: id}, true
	}
	return detect.EntityRef{}, false
}

func (pronounCatalog) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	if name == "彼" {
		return detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"}, detect.SourceName, true
	}
	return detect.EntityRef{}, "", false
}

func (pronounCatalog) ListNames(kind detect.EntityKind) []string {
	if kind == detect.EntityCharacter {
		return []string{"彼"}
	}
	return nil
}

func (pronounCatalog) DetectionHints(kind detect.EntityKind, id string) (detect.Hints, bool) {
	if kind == detect.EntityCharacter && id == "hero" {
		return detect.Hints{Pronouns: []string{"彼"}}, true
	}
	return detect.Hints{}, false
}

func TestStorytellerSource_LowConfidenceCarriesData(t *testing.T) {
	src := &StorytellerSource{Catalog: pronounCatalog{}}
	diags, err := src.Generate(context.Background(), "file:///c.md", "彼は走った")
	if err != nil {
		t.Fatal(err)
	}
	if len(diags) != 1 {
		t.Fatalf("len = %d, want 1", len(diags))
	}
	if diags[0].Data == nil {
		t.Fatal("data is nil")
	}
	if diags[0].Data.EntityID != "hero" {
		t.Fatalf("entityId = %q", diags[0].Data.EntityID)
	}
	if diags[0].Data.Confidence != 0.6 {
		t.Fatalf("confidence = %v", diags[0].Data.Confidence)
	}
}
