package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/project/store"
)

// buildStoreWithTimeline constructs a Store with one Timeline for unit tests.
// Why: avoids disk I/O by building the store directly without project.Load.
func buildStoreWithTimeline() *store.Store {
	st := store.New()
	_ = st.AddTimeline(&domain.Timeline{
		ID:      "main_story",
		Name:    "Main Story",
		Scope:   domain.TimelineScopeStory,
		Summary: "The main narrative arc",
		Events: []domain.TimelineEvent{
			{ID: "e1", Title: "Opening", Category: domain.EventCategoryPlotPoint, Summary: "Start"},
			{ID: "e2", Title: "Climax", Category: domain.EventCategoryClimax, Summary: "Peak"},
		},
	})
	return st
}

func TestTimelineViewTool_Definition(t *testing.T) {
	def := TimelineViewTool{}.Definition()
	if def.Name != "timeline_view" {
		t.Errorf("name = %q, want timeline_view", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestTimelineViewTool_Handle_ByID(t *testing.T) {
	st := buildStoreWithTimeline()
	tool := TimelineViewTool{store: st}
	args := json.RawMessage(`{"id":"main_story"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "Main Story") {
		t.Errorf("expected name in text: %q", text)
	}
	if !strings.Contains(text, "story") {
		t.Errorf("expected scope in text: %q", text)
	}
	if !strings.Contains(text, "2") {
		t.Errorf("expected event_count=2 in text: %q", text)
	}
}

func TestTimelineViewTool_Handle_List(t *testing.T) {
	st := buildStoreWithTimeline()
	tool := TimelineViewTool{store: st}
	args := json.RawMessage(`{}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "Main Story") {
		t.Errorf("expected timeline name in list: %q", text)
	}
}

func TestTimelineViewTool_Handle_UnknownID(t *testing.T) {
	st := store.New()
	tool := TimelineViewTool{store: st}
	args := json.RawMessage(`{"id":"no_such_id"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for unknown id")
	}
}
