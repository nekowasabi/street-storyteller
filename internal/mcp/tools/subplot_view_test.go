package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/project/store"
)

// buildStoreWithSubplots constructs a Store with two Subplots for unit tests.
// Why: avoids disk I/O by injecting the store directly, same pattern as
// buildStoreWithTimeline in timeline_view_test.go.
func buildStoreWithSubplots() *store.Store {
	st := store.New()
	_ = st.AddSubplot(&domain.Subplot{
		ID:      "main_plot",
		Name:    "Main Plot",
		Type:    domain.SubplotTypeMain,
		Status:  domain.SubplotStatusActive,
		Summary: "The hero's journey",
		Beats: []domain.PlotBeat{
			{ID: "b1", Title: "Opening", Summary: "Start", StructurePosition: domain.StructurePositionSetup},
		},
		Intersections: []domain.PlotIntersection{
			{ID: "i1", SourceSubplotID: "main_plot", SourceBeatID: "b1",
				TargetSubplotID: "love_story", TargetBeatID: "lb1",
				Summary: "Paths cross", InfluenceDirection: domain.InfluenceDirectionForward},
		},
	})
	_ = st.AddSubplot(&domain.Subplot{
		ID:      "love_story",
		Name:    "Love Story",
		Type:    domain.SubplotTypeSubplot,
		Status:  domain.SubplotStatusActive,
		Summary: "A romance arc",
		Beats:   []domain.PlotBeat{},
	})
	return st
}

func TestSubplotViewTool_Definition(t *testing.T) {
	def := SubplotViewTool{}.Definition()
	if def.Name != "subplot_view" {
		t.Errorf("name = %q, want subplot_view", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestSubplotViewTool_Handle_ByID(t *testing.T) {
	st := buildStoreWithSubplots()
	tool := SubplotViewTool{store: st}
	args := json.RawMessage(`{"id":"main_plot"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "Main Plot") {
		t.Errorf("expected name in text: %q", text)
	}
	if !strings.Contains(text, "main") {
		t.Errorf("expected type in text: %q", text)
	}
	if !strings.Contains(text, "beat_count: 1") {
		t.Errorf("expected beat_count=1 in text: %q", text)
	}
	if !strings.Contains(text, "intersection_count: 1") {
		t.Errorf("expected intersection_count=1 in text: %q", text)
	}
}

func TestSubplotViewTool_Handle_List(t *testing.T) {
	st := buildStoreWithSubplots()
	tool := SubplotViewTool{store: st}
	args := json.RawMessage(`{}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if !strings.Contains(text, "Main Plot") {
		t.Errorf("expected Main Plot in list: %q", text)
	}
	if !strings.Contains(text, "Love Story") {
		t.Errorf("expected Love Story in list: %q", text)
	}
}

func TestSubplotViewTool_Handle_FilterType(t *testing.T) {
	st := buildStoreWithSubplots()
	tool := SubplotViewTool{store: st}
	args := json.RawMessage(`{"filter_type":"subplot"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	text := res.Content[0].Text
	if strings.Contains(text, "Main Plot") {
		t.Errorf("Main Plot (type=main) should be filtered out: %q", text)
	}
	if !strings.Contains(text, "Love Story") {
		t.Errorf("expected Love Story (type=subplot) in filtered list: %q", text)
	}
}

func TestSubplotViewTool_Handle_UnknownID(t *testing.T) {
	st := store.New()
	tool := SubplotViewTool{store: st}
	args := json.RawMessage(`{"id":"no_such_id"}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError for unknown id")
	}
}

func TestSubplotViewTool_Handle_LoadError(t *testing.T) {
	// No store injected + invalid project root → project.Load fails.
	tool := SubplotViewTool{}
	args := json.RawMessage(`{}`)
	res, err := tool.Handle(context.Background(), args, ExecutionContext{ProjectRoot: "/nonexistent/path/that/cannot/load"})
	if err != nil {
		t.Fatalf("Handle must not return Go error: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError when project load fails")
	}
}
