package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
)

// frontmatterSkeleton is the YAML frontmatter block inserted into .md files
// that do not already have one.
const frontmatterSkeleton = "---\ncharacters: []\nsettings: []\nforeshadowings: []\ntimelines: []\nphases: []\n---\n"

// MetaGenerateTool inserts YAML frontmatter skeletons into manuscript .md files.
type MetaGenerateTool struct{}

type metaGenerateArgs struct {
	Path string `json:"path"`
}

// Definition advertises the meta_generate schema.
func (MetaGenerateTool) Definition() protocol.Tool {
	return protocol.Tool{
		Name:        "meta_generate",
		Description: "Insert YAML frontmatter skeleton into manuscript .md files (skips files that already have frontmatter)",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"path":{"type":"string","description":"Single .md file or directory"}},"required":["path"]}`),
	}
}

// Handle resolves the target path and inserts frontmatter where absent.
func (MetaGenerateTool) Handle(_ context.Context, args json.RawMessage, _ ExecutionContext) (*protocol.CallToolResult, error) {
	var a metaGenerateArgs
	if len(args) > 0 {
		_ = json.Unmarshal(args, &a)
	}

	if a.Path == "" {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: "path is required"}},
			IsError: true,
		}, nil
	}

	info, err := os.Stat(a.Path)
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("path not found: %s", a.Path)}},
			IsError: true,
		}, nil
	}

	var count int
	if info.IsDir() {
		count, err = generateForDir(a.Path)
	} else {
		var generated bool
		generated, err = generateForFile(a.Path)
		if generated {
			count = 1
		}
	}
	if err != nil {
		return &protocol.CallToolResult{
			Content: []protocol.ContentBlock{{Type: "text", Text: err.Error()}},
			IsError: true,
		}, nil
	}

	return &protocol.CallToolResult{
		Content: []protocol.ContentBlock{{Type: "text", Text: fmt.Sprintf("frontmatter generated: %d files", count)}},
	}, nil
}

// generateForDir walks dir recursively and calls generateForFile on each .md file.
func generateForDir(dir string) (int, error) {
	var count int
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.HasSuffix(d.Name(), ".md") {
			generated, err := generateForFile(path)
			if err != nil {
				return err
			}
			if generated {
				count++
			}
		}
		return nil
	})
	return count, err
}

// generateForFile inserts frontmatterSkeleton at the top of path when the file
// does not already start with "---". Returns true if the file was modified.
func generateForFile(path string) (bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return false, err
	}
	if strings.HasPrefix(string(data), "---") {
		// Already has frontmatter — skip.
		return false, nil
	}
	newContent := frontmatterSkeleton + string(data)
	if err := os.WriteFile(path, []byte(newContent), 0644); err != nil {
		return false, err
	}
	return true, nil
}
