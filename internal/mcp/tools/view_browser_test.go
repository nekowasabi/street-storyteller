package tools

import "testing"

func TestViewBrowserTool_Definition(t *testing.T) {
	def := ViewBrowserTool{}.Definition()
	if def.Name != "view_browser" {
		t.Errorf("name = %q", def.Name)
	}
	if len(def.InputSchema) == 0 {
		t.Error("schema empty")
	}
}
