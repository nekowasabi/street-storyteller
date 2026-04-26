package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestMetaCheckTool_Definition(t *testing.T) {
	def := MetaCheckTool{}.Definition()
	if def.Name != "meta_check" {
		t.Errorf("name = %q", def.Name)
	}
	if def.Description == "" {
		t.Error("description should not be empty")
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestMetaCheckTool_Handle_Stub(t *testing.T) {
	dir := t.TempDir()
	res, err := MetaCheckTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{ProjectRoot: dir})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
	if !strings.Contains(res.Content[0].Text, "0 files validated") {
		t.Errorf("text = %q", res.Content[0].Text)
	}
}
