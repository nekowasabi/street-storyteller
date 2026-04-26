package diagnostics

import (
	"context"
	"testing"

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
