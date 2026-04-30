package tools

import (
	"strings"
	"testing"
)

func TestProcess13E2E_RegistryListExposesNormalizedPlotTools(t *testing.T) {
	r := NewRegistry()
	for _, tool := range []Tool{
		MetaCheckTool{},
		LSPValidateTool{},
		ViewBrowserTool{},
		TimelineCreateTool{},
		TimelineViewTool{},
		TimelineAnalyzeTool{},
		EventCreateTool{},
		EventUpdateTool{},
		PlotCreateTool{},
		PlotViewTool{},
		BeatCreateTool{},
		IntersectionCreateTool{},
		ForeshadowingCreateTool{},
		ForeshadowingViewTool{},
		ManuscriptBindingTool{},
		MetaGenerateTool{},
		ElementCreateTool{},
		LSPFindReferencesTool{},
	} {
		if err := r.Register(tool); err != nil {
			t.Fatalf("Register(%s): %v", tool.Definition().Name, err)
		}
	}

	names := map[string]bool{}
	for _, def := range r.List() {
		names[def.Name] = true
	}

	if !names["plot_create"] {
		t.Fatal("tools/list equivalent must expose plot_create")
	}
	if !names["plot_view"] {
		t.Fatal("tools/list equivalent must expose plot_view")
	}
	legacyCreate := "sub" + "plot_create"
	legacyView := "sub" + "plot_view"
	if names[legacyCreate] {
		t.Fatalf("tools/list equivalent must not expose legacy %s", legacyCreate)
	}
	if names[legacyView] {
		t.Fatalf("tools/list equivalent must not expose legacy %s", legacyView)
	}
}

func TestProcess13E2E_BeatCreateSchemaUsesPlotID(t *testing.T) {
	schema := string(BeatCreateTool{}.Definition().InputSchema)
	if !strings.Contains(schema, `"plot_id"`) {
		t.Fatalf("beat_create schema must include plot_id: %s", schema)
	}
}

func TestProcess13E2E_IntersectionCreateSchemaUsesPlotKeys(t *testing.T) {
	schema := string(IntersectionCreateTool{}.Definition().InputSchema)
	if !strings.Contains(schema, `"source_plot"`) {
		t.Fatalf("intersection_create schema must include source_plot: %s", schema)
	}
	if !strings.Contains(schema, `"target_plot"`) {
		t.Fatalf("intersection_create schema must include target_plot: %s", schema)
	}
	legacySource := `"source_sub` + `plot"`
	legacyTarget := `"target_sub` + `plot"`
	if strings.Contains(schema, legacySource) {
		t.Fatalf("intersection_create schema must not include legacy source plot key: %s", schema)
	}
	if strings.Contains(schema, legacyTarget) {
		t.Fatalf("intersection_create schema must not include legacy target plot key: %s", schema)
	}
}
