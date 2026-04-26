// Package service hosts application services that consolidate logic shared
// between the CLI and MCP adapters. Each service exposes a minimal,
// adapter-agnostic API so the CLI/MCP layers reduce to thin presentation
// shells.
//
// Why a separate package instead of reusing internal/cli or internal/mcp:
// neither adapter should depend on the other, and the duplicated walk + parse
// logic was the most expensive class of drift to maintain across them.
package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/meta"
)

// MetaCheckService validates manuscript YAML frontmatter under a directory.
//
// Why depth-1 walk: matches the CLI convention documented in
// internal/cli/modules/meta/check.go — chapters live directly under
// manuscripts/, and recursive walks would also pick up draft notes that are
// not authored manuscripts. The MCP adapter previously walked recursively;
// unifying on depth-1 here is the corrected behavior.
type MetaCheckService struct{}

// MetaCheckResult is the adapter-agnostic return contract.
type MetaCheckResult struct {
	FilesChecked int
}

// NewMetaCheckService returns a stateless service instance.
func NewMetaCheckService() *MetaCheckService { return &MetaCheckService{} }

// Run scans root for *.md files (depth 1), parses each via meta.Parse, and
// returns the count. A non-existent root yields a zero-count result without
// error so callers operating on fresh projects do not need to pre-check.
func (s *MetaCheckService) Run(root string) (MetaCheckResult, error) {
	files, err := collectMarkdown(root)
	if err != nil {
		return MetaCheckResult{}, err
	}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return MetaCheckResult{}, fmt.Errorf("read %s: %w", f, err)
		}
		if _, err := meta.Parse(data); err != nil {
			return MetaCheckResult{}, fmt.Errorf("%s: %w", f, err)
		}
	}
	return MetaCheckResult{FilesChecked: len(files)}, nil
}

func collectMarkdown(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read dir %s: %w", dir, err)
	}
	out := []string{}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		out = append(out, filepath.Join(dir, e.Name()))
	}
	return out, nil
}
