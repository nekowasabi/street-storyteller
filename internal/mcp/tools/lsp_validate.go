package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// LSPValidateTool runs entity detection over a single manuscript file.
type LSPValidateTool struct{}

type lspValidateArgs struct {
	File string `json:"file"`
}

// Definition advertises the lsp_validate schema.
func (LSPValidateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "lsp_validate",
		Description: "Run storyteller LSP-style entity detection on a manuscript",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"file":{"type":"string"}},"required":["file"]}`),
	}
}

// Handle reads the file, calls detect.Detect with a nil catalog (Green-phase
// minimal), and returns "<N> entities detected".
func (LSPValidateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a lspValidateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	if a.File == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "file is required"}},
			IsError: true,
		}, nil
	}
	abs, err := filepath.Abs(a.File)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}
	// Why: Catalog=nil is intentional for Green-phase minimal — Detect returns
	// an empty slice rather than panicking, matching the contract documented
	// in detect/reference.go (req.Catalog nil branch).
	results := detect.Detect(detect.DetectionRequest{
		URI:     "file://" + abs,
		Content: string(content),
	})
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d entities detected", len(results))}},
	}, nil
}
