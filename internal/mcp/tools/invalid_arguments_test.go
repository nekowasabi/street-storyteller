package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestToolsRejectMalformedArgumentsBeforeExecution(t *testing.T) {
	for _, tool := range []Tool{MetaCheckTool{}, LSPValidateTool{}, ViewBrowserTool{}, TimelineCreateTool{}, TimelineViewTool{}, TimelineAnalyzeTool{}, EventCreateTool{}, EventUpdateTool{}, PlotCreateTool{}, PlotViewTool{}, BeatCreateTool{}, IntersectionCreateTool{}, ForeshadowingCreateTool{}, ForeshadowingViewTool{}, ManuscriptBindingTool{}, MetaGenerateTool{}, ElementCreateTool{}, LSPFindReferencesTool{}} {
		t.Run(tool.Definition().Name, func(t *testing.T) {
			for _, raw := range []string{`[]`, `{"path":`, `{"file":123,"entity_type":123,"path":123,"name":123,"id":123,"timeline_id":123,"plot_id":123,"manuscript":123,"source_plot":123}`} {
				res, err := tool.Handle(context.Background(), json.RawMessage(raw), ExecutionContext{ProjectRoot: t.TempDir()})
				if err != nil {
					t.Fatal(err)
				}
				if res == nil || !res.IsError || len(res.Content) == 0 || !strings.HasPrefix(res.Content[0].Text, "invalid arguments:") {
					t.Errorf("input %s: expected argument error before execution, got %+v", raw, res)
				}
			}
		})
	}
}

func TestMetaGenerateDoesNotWriteAfterArgumentTypeError(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "story.md")
	original := "# Authored manuscript\n"
	writeFile(t, path, original)
	raw := json.RawMessage(fmt.Sprintf(`{"path":%q,"path":123}`, path))
	res, err := (MetaGenerateTool{}).Handle(context.Background(), raw, ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	if !res.IsError {
		t.Errorf("invalid path type reported success: %+v", res)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != original {
		t.Errorf("invalid arguments modified manuscript: %q", got)
	}
}
