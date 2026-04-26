package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/service"
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

// Handle delegates to ValidateService.Run and returns "<N> entities detected".
// Why: replaced the inline filepath.Abs + os.ReadFile + detect.Detect sequence
// with service.NewValidateService().Run to consolidate file-read and detection
// logic in one place shared with the CLI adapter.
func (LSPValidateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a lspValidateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	results, err := service.NewValidateService().Run(a.File)
	if err != nil {
		if errors.Is(err, service.ErrEmptyPath) {
			return &protocol.CallToolResult{
				Content: []protocol.ContentBlock{{Type: "text", Text: "file is required"}},
				IsError: true,
			}, nil
		}
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d entities detected", len(results))}},
	}, nil
}
