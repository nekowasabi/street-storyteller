package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	lspprotocol "github.com/takets/street-storyteller/internal/lsp/protocol"
	lspserver "github.com/takets/street-storyteller/internal/lsp/server"
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
// Low-confidence diagnostics from the generator are appended as JSON so
// Diagnostic.data (confidence, entityId) is not dropped.
func (LSPValidateTool) Handle(ctx context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
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
	diags, derr := storytellerDiagnostics(ctx, ec.ProjectRoot, a.File)
	if derr != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: derr.Error()}},
			IsError: true,
		}, nil
	}
	if len(diags) > 0 {
		b, merr := json.Marshal(diags)
		if merr != nil {
			return &protocol.CallToolResult{
				Content: []protocol.ContentBlock{{Type: "text", Text: merr.Error()}},
				IsError: true,
			}, nil
		}
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: string(b)}},
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d entities detected", len(results))}},
	}, nil
}

func storytellerDiagnostics(ctx context.Context, projectRoot, file string) ([]lspprotocol.Diagnostic, error) {
	if file == "" {
		return nil, nil
	}
	// mcp start --stdio without --path leaves ProjectRoot empty while the
	// process working directory is the project root.
	if projectRoot == "" {
		wd, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		projectRoot = wd
	}
	abs, err := filepath.Abs(file)
	if err != nil {
		return nil, err
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	opts, err := lspserver.NewServerOptions(ctx, "file://"+projectRoot)
	if err != nil {
		return nil, err
	}
	src := &diagnostics.StorytellerSource{Catalog: opts.Catalog}
	return src.Generate(ctx, "file://"+abs, string(content))
}
