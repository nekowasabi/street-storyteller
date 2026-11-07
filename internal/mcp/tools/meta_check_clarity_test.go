package tools

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

func TestMetaCheckTool_ClarityBreak1_IsError(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", "..", "service", "testdata", "clarity_rainkey_break1"))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	res, err := MetaCheckTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if !res.IsError {
		t.Fatalf("want IsError, got %+v", res)
	}
	if !strings.Contains(res.Content[0].Text, "RDR-102") {
		t.Errorf("text = %q", res.Content[0].Text)
	}
}

func TestMetaCheckTool_ClarityPass(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", "..", "service", "testdata", "clarity_rainkey"))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	res, err := MetaCheckTool{}.Handle(context.Background(), json.RawMessage(`{}`), ExecutionContext{ProjectRoot: root})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if res.IsError {
		t.Errorf("unexpected IsError: %+v", res)
	}
}
