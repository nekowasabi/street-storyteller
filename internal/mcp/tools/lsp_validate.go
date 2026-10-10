package tools

import (
	"context"
	"encoding/json"
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
		InputSchema: json.RawMessage(`{"type":"object","properties":{"file":{"type":"string","description":"Absolute or project-relative manuscript file"}},"required":["file"]}`),
	}
}

// Handle runs catalog-backed detection on the file. Low-confidence hits are
// returned as diagnostics JSON so Diagnostic.data (confidence, entityId) is
// not dropped; otherwise it returns "<N> entities detected".
func (LSPValidateTool) Handle(ctx context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a lspValidateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	if a.File == "" {
		return lspValidateError("file is required"), nil
	}
	res, err := service.NewValidateService().Run(ctx, ec.ProjectRoot, resolveProjectPath(ec.ProjectRoot, a.File))
	if err != nil {
		return lspValidateError(err.Error()), nil
	}
	if len(res.Diagnostics) > 0 {
		b, err := json.Marshal(res.Diagnostics)
		if err != nil {
			return lspValidateError(err.Error()), nil
		}
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: string(b)}},
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d entities detected", len(res.Detected))}},
	}, nil
}

func lspValidateError(msg string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		IsError: true,
	}
}
