package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/service"
)

// MetaCheckTool validates manuscript YAML frontmatter.
type MetaCheckTool struct{}

type metaCheckArgs struct {
	Path string `json:"path"`
}

// Definition advertises the meta_check schema.
func (MetaCheckTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "meta_check",
		Description: "Validate manuscript metadata (YAML frontmatter)",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"path":{"type":"string"}}}`),
	}
}

// Handle resolves the target directory and delegates to MetaCheckService.Run.
// Why: replaced the inline filepath.Walk loop with service.NewMetaCheckService().Run
// to unify depth-1 walk behavior between CLI and MCP adapters (previously MCP
// walked recursively while CLI was depth-1 only).
func (MetaCheckTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a metaCheckArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	target := a.Path
	if target == "" {
		target = filepath.Join(ec.ProjectRoot, "manuscripts")
	}

	result, err := service.NewMetaCheckService().Run(target)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d files validated", result.FilesChecked)}},
	}, nil
}
