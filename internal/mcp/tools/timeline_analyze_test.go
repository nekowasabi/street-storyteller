package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/project/store"
)

// buildStoreWithCausalTimeline builds a store whose timeline has causal links.
func buildStoreWithCausalTimeline() *store.Store {
	st := store.New()
	_ = st.AddTimeline(&domain.Timeline{
		ID:      "causal_tl",
		Name:    "Causal Timeline",
		Scope:   domain.TimelineScopeStory,
		Summary: "Timeline with causal links",
		Events: []domain.TimelineEvent{
			{ID: "e1", Title: "Cause", Category: domain.EventCategoryPlotPoint, Summary: "Root cause",
				Causes: []string{"e2"}},
			{ID: "e2", Title: "Effect", Category: domain.EventCategoryPlotPoint, Summary: "Result",
				CausedBy: []string{"e1"}},
			{ID: "e3", Title: "Standalone", Category: domain.EventCategoryWorldEvent, Summary: "No links"},
		},
	})
	return st
}

func TestTimelineAnalyzeTool_Definition(t *testing.T) {
	def := TimelineAnalyzeTool{}.Definition()
	if def.Name != "timeline_analyze" {
		t.Errorf("name = %q, want timeline_analyze", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestTimelineAnalyzeTool_Handle_Success(t *testing.T) {
	st := buildStoreWithCausalTimeline()
	tool := TimelineAnalyzeTool{store: st}
	args := json.RawMessage(`{"id":"causal_tl"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	// Should report 3 events
	if !strings.Contains(text, "3") {
		t.Errorf("expected event count 3 in text: %q", text)
	}
	// Should report 2 events with causal links (e1 has causes, e2 has causedBy)
	if !strings.Contains(text, "2") {
		t.Errorf("expected causal link count 2 in text: %q", text)
	}
}

func TestTimelineAnalyzeTool_Handle_MissingID(t *testing.T) {
	st := store.New()
	tool := TimelineAnalyzeTool{store: st}
	args := json.RawMessage(`{}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for missing id")
	}
}

func TestTimelineAnalyzeTool_Handle_NotFound(t *testing.T) {
	st := store.New()
	tool := TimelineAnalyzeTool{store: st}
	args := json.RawMessage(`{"id":"nonexistent"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for not found")
	}
}
