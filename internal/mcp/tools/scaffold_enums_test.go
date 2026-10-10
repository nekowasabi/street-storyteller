package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
)

func TestBeatCreateValidatesStructurePosition(t *testing.T) {
	for _, value := range []string{"", "setup", "rising", "climax", "falling", "resolution", "unknown", "CLIMAX"} {
		t.Run(value, func(t *testing.T) {
			raw, _ := json.Marshal(map[string]string{"plot_id": "main", "title": "Opening", "summary": "Summary", "structure_position": value})
			got, err := (BeatCreateTool{}).Handle(context.Background(), raw, ExecutionContext{})
			if err != nil {
				t.Fatal(err)
			}
			wantError := value == "unknown" || value == "CLIMAX"
			if got.IsError != wantError {
				t.Errorf("position %q: IsError=%v, want %v", value, got.IsError, wantError)
			}
		})
	}
}

func TestEventCreateValidatesCategory(t *testing.T) {
	for _, value := range []string{"plot_point", "character_event", "world_event", "backstory", "foreshadow", "climax", "resolution", "unknown", "CLIMAX"} {
		t.Run(value, func(t *testing.T) {
			raw, _ := json.Marshal(map[string]string{"timeline_id": "main", "title": "Opening", "summary": "Summary", "category": value})
			got, err := (EventCreateTool{}).Handle(context.Background(), raw, ExecutionContext{})
			if err != nil {
				t.Fatal(err)
			}
			wantError := value == "unknown" || value == "CLIMAX"
			if got.IsError != wantError {
				t.Errorf("category %q: IsError=%v, want %v", value, got.IsError, wantError)
			}
		})
	}
}

func TestEventUpdateValidatesImportance(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".storyteller.json"), `{"version":"1.0.0"}`)
	writeFile(t, filepath.Join(root, "src/timelines/main.ts"), `export const main = { id: "main", name: "Main", scope: "story", summary: "Summary", events: [{id: "e1", title: "Opening", category: "plot_point", summary: "Summary", characters: [], settings: [], chapters: [], time: {order: 1}}] };`)
	for _, value := range []string{"major", "minor", "background", "unknown", "MAJOR", ""} {
		t.Run(value, func(t *testing.T) {
			raw, _ := json.Marshal(map[string]string{"timeline_id": "main", "event_id": "e1", "importance": value})
			got, err := (EventUpdateTool{}).Handle(context.Background(), raw, ExecutionContext{ProjectRoot: root})
			if err != nil {
				t.Fatal(err)
			}
			wantError := value == "unknown" || value == "MAJOR" || value == ""
			if got.IsError != wantError {
				t.Errorf("importance %q: IsError=%v, want %v; %s", value, got.IsError, wantError, got.Content[0].Text)
			}
		})
	}
	got, err := (EventUpdateTool{}).Handle(context.Background(), json.RawMessage(`{"timeline_id":"main","event_id":"e1","title":"Changed"}`), ExecutionContext{ProjectRoot: root})
	if err != nil || got.IsError {
		t.Fatalf("omitted importance: %v %+v", err, got)
	}
}

func TestIntersectionCreateValidatesInfluence(t *testing.T) {
	for _, tc := range []struct {
		field  string
		values []string
	}{
		{"influence_direction", []string{"", "forward", "backward", "mutual", "unknown", "FORWARD"}},
		{"influence_level", []string{"", "high", "medium", "low", "unknown", "HIGH"}},
	} {
		for _, value := range tc.values {
			t.Run(tc.field+"/"+value, func(t *testing.T) {
				args := map[string]string{"source_plot": "a", "source_beat": "a1", "target_plot": "b", "target_beat": "b1", "summary": "Connection", tc.field: value}
				raw, _ := json.Marshal(args)
				got, err := (IntersectionCreateTool{}).Handle(context.Background(), raw, ExecutionContext{})
				if err != nil {
					t.Fatal(err)
				}
				wantError := value == "unknown" || value == "FORWARD" || value == "HIGH"
				if got.IsError != wantError {
					t.Errorf("%s=%q: IsError=%v, want %v", tc.field, value, got.IsError, wantError)
				}
			})
		}
	}
}
