package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	lspprotocol "github.com/takets/street-storyteller/internal/lsp/protocol"
	lspserver "github.com/takets/street-storyteller/internal/lsp/server"
)

// ValidateService runs the storyteller detect pipeline on a single manuscript
// file against the project's entity catalog. Both the CLI (`lsp validate`)
// and MCP (`lsp_validate`) adapters use it, so their counts always agree.
type ValidateService struct{}

// ErrEmptyPath is returned when Run is called with an empty file path.
var ErrEmptyPath = errors.New("file path is required")

// NewValidateService returns a stateless service instance.
func NewValidateService() *ValidateService { return &ValidateService{} }

// ValidateResult holds every detection plus the low-confidence subset as
// LSP diagnostics, both computed from the same catalog and frontmatter.
type ValidateResult struct {
	Detected    []detect.DetectedEntity
	Diagnostics []lspprotocol.Diagnostic
}

// Run detects entities in file using the catalog of the project at
// projectRoot. An empty projectRoot means the working directory.
func (s *ValidateService) Run(ctx context.Context, projectRoot, file string) (ValidateResult, error) {
	if file == "" {
		return ValidateResult{}, ErrEmptyPath
	}
	abs, err := filepath.Abs(file)
	if err != nil {
		return ValidateResult{}, fmt.Errorf("abs %s: %w", file, err)
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return ValidateResult{}, fmt.Errorf("read %s: %w", abs, err)
	}
	// Why: an empty root URI makes NewServerOptions use the working directory.
	rootURI := ""
	if projectRoot != "" {
		if rootURI, err = fileURI(projectRoot); err != nil {
			return ValidateResult{}, err
		}
	}
	opts, err := lspserver.NewServerOptions(ctx, rootURI)
	if err != nil {
		return ValidateResult{}, err
	}
	docURI, err := fileURI(abs)
	if err != nil {
		return ValidateResult{}, err
	}
	src := &diagnostics.StorytellerSource{Catalog: opts.Catalog}
	diags, err := src.Generate(ctx, docURI, string(content))
	if err != nil {
		return ValidateResult{}, err
	}
	return ValidateResult{Detected: src.Detect(docURI, string(content)), Diagnostics: diags}, nil
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
