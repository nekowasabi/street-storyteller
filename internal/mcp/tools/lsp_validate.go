package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	lspprotocol "github.com/takets/street-storyteller/internal/lsp/protocol"
	lspserver "github.com/takets/street-storyteller/internal/lsp/server"
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
	detected, diags, err := storytellerDetect(ctx, ec.ProjectRoot, a.File)
	if err != nil {
		return lspValidateError(err.Error()), nil
	}
	if len(diags) > 0 {
		b, err := json.Marshal(diags)
		if err != nil {
			return lspValidateError(err.Error()), nil
		}
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: string(b)}},
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d entities detected", len(detected))}},
	}, nil
}

func lspValidateError(msg string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: msg}},
		IsError: true,
	}
}

func storytellerDetect(ctx context.Context, projectRoot, file string) ([]detect.DetectedEntity, []lspprotocol.Diagnostic, error) {
	abs, err := filepath.Abs(file)
	if err != nil {
		return nil, nil, err
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return nil, nil, err
	}
	// Why: an empty root URI makes NewServerOptions use the working directory,
	// which is the project root when mcp start runs without --path.
	rootURI := ""
	if projectRoot != "" {
		if rootURI, err = fileURI(projectRoot); err != nil {
			return nil, nil, err
		}
	}
	opts, err := lspserver.NewServerOptions(ctx, rootURI)
	if err != nil {
		return nil, nil, err
	}
	docURI, err := fileURI(abs)
	if err != nil {
		return nil, nil, err
	}
	src := &diagnostics.StorytellerSource{Catalog: opts.Catalog}
	diags, err := src.Generate(ctx, docURI, string(content))
	if err != nil {
		return nil, nil, err
	}
	return src.Detect(docURI, string(content)), diags, nil
}

// fileURI builds an escaped file:// URI; plain "file://"+path breaks on
// relative paths, which url.Parse reads as a host.
func fileURI(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return (&url.URL{Scheme: "file", Path: filepath.ToSlash(abs)}).String(), nil
}
