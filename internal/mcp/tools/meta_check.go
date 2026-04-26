package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/meta"
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

// Handle walks <path>/*.md (default <projectRoot>/manuscripts) and parses
// each via meta.Parse. Returns "<N> files validated" on success or an error
// content block on first parse failure.
func (MetaCheckTool) Handle(_ context.Context, args json.RawMessage, ec ExecutionContext) (*protocol.CallToolResult, error) {
	var a metaCheckArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}
	target := a.Path
	if target == "" {
		target = filepath.Join(ec.ProjectRoot, "manuscripts")
	}

	count := 0
	walkErr := filepath.Walk(target, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			// Why: missing root dir is a Green-phase no-op (0 files validated)
			// rather than an error, mirroring the TS implementation that
			// tolerates partially-bootstrapped projects.
			if os.IsNotExist(err) {
				return filepath.SkipDir
			}
			return err
		}
		if info.IsDir() || !strings.HasSuffix(strings.ToLower(p), ".md") {
			return nil
		}
		content, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		if _, err := meta.Parse(content); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
		count++
		return nil
	})
	if walkErr != nil && !os.IsNotExist(walkErr) {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: walkErr.Error()}},
			IsError: true,
		}, nil
	}
	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("%d files validated", count)}},
	}, nil
}
