package service

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/detect"
)

// ValidateService runs the storyteller detect pipeline on a single manuscript
// file. It encapsulates the file-read + DetectionRequest construction that
// both the CLI (`lsp validate`) and MCP (`lsp_validate`) adapters previously
// duplicated.
//
// Why no Catalog field yet: the adapters currently pass Catalog=nil — that
// short-circuits Phase 1 of detect.Detect and yields zero detections. Adding
// catalog wiring is deferred to the wave that graduates internal/lsp from
// skeleton (per the existing CLI Why-comment).
type ValidateService struct{}

// ErrEmptyPath is returned when Run is called with an empty file path.
var ErrEmptyPath = errors.New("file path is required")

// NewValidateService returns a stateless service instance.
func NewValidateService() *ValidateService { return &ValidateService{} }

// Run reads file and invokes detect.Detect with a nil catalog. The returned
// slice is the verbatim detect.Detect output so adapters can format it as
// they prefer (CLI prints a count; MCP returns a content block).
func (s *ValidateService) Run(file string) ([]detect.DetectedEntity, error) {
	if file == "" {
		return nil, ErrEmptyPath
	}
	abs, err := filepath.Abs(file)
	if err != nil {
		return nil, fmt.Errorf("abs %s: %w", file, err)
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", abs, err)
	}
	// Why: Catalog=nil mirrors current adapter behavior; replacing it with a
	// real catalog is a downstream concern (kept out of this BASE to stay
	// surgical).
	return detect.Detect(detect.DetectionRequest{
		URI:     "file://" + abs,
		Content: string(data),
		Catalog: nil,
	}), nil
}
