package tools

import (
	"context"
	"encoding/json"
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
