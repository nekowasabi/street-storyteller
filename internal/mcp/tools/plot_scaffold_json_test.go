package tools

import (
	"context"
	"encoding/json"
	"github.com/takets/street-storyteller/internal/project/entity"
	"strings"
	"testing"
)

func TestPlotScaffoldsLoadAsProjectSource(t *testing.T) {
	scaffold := func(tool Tool, args string) map[string]json.RawMessage {
		t.Helper()
		res, err := tool.Handle(context.Background(), json.RawMessage(args), ExecutionContext{})
		if err != nil || res.IsError {
			t.Fatalf("%s: %v %+v", tool.Definition().Name, err, res)
		}
		_, body, found := strings.Cut(res.Content[0].Text, "\n")
		if !found {
			t.Fatal("missing JSON body")
		}
		var obj map[string]json.RawMessage
		if err := json.Unmarshal([]byte(body), &obj); err != nil {
			t.Fatal(err)
		}
		if _, ok := obj["id"]; !ok {
			t.Errorf("%s lacks canonical id: %s", tool.Definition().Name, body)
		}
		return obj
	}
	plot := scaffold(PlotCreateTool{}, `{"id":"main","name":"Main","type":"main","summary":"Main story"}`)
	beat := scaffold(BeatCreateTool{}, `{"id":"b1","plot_id":"main","title":"Opening","summary":"Start","structure_position":"setup"}`)
	intersection := scaffold(IntersectionCreateTool{}, `{"source_plot":"main","source_beat":"b1","target_plot":"side","target_beat":"b2","summary":"Link"}`)
	plot["beats"], _ = json.Marshal([]any{beat})
	plot["intersections"], _ = json.Marshal([]any{intersection})
	raw, _ := json.Marshal(plot)
	loaded, err := entity.LoadPlot(strings.NewReader("export const main = " + string(raw) + ";"))
	if err != nil {
		t.Fatalf("generated scaffold cannot be loaded: %v", err)
	}
	if loaded.ID != "main" || len(loaded.Beats) != 1 || loaded.Beats[0].ID != "b1" || loaded.Beats[0].StructurePosition != "setup" {
		t.Fatalf("plot/beat data changed: %+v", loaded)
	}
	if len(loaded.Intersections) != 1 || loaded.Intersections[0].SourcePlotID != "main" || loaded.Intersections[0].TargetBeatID != "b2" || loaded.Intersections[0].InfluenceLevel == nil || *loaded.Intersections[0].InfluenceLevel != "medium" {
		t.Fatalf("intersection data changed: %+v", loaded.Intersections)
	}
}
