package tools

import (
	"context"
	"encoding/json"
	"testing"
)

func TestLspValidateTool_Definition(t *testing.T) {
	def := LSPValidateTool{}.Definition()
	if def.Name != "lsp_validate" {
		t.Errorf("name = %q", def.Name)
	}
	if len(def.InputSchema) == 0 {
		t.Error("input schema empty")
	}
}

func TestLspValidateTool_NoFile_Errors(t *testing.T) {
	res, err := LSPValidateTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Errorf("expected IsError=true, got %+v", res)
	}
}
