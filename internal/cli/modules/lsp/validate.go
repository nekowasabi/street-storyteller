// Package lsp implements the `storyteller lsp validate` command.
//
// The command runs the detect pipeline on a single manuscript file and prints
// each discovered entity with its location, type, ID and confidence score.
package lsp

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/service"
)

// severityThreshold maps --severity values to minimum confidence thresholds.
// Why: confidence is a continuous 0.0-1.0 score; mapping named severity levels
// to thresholds lets users say "show me only high-confidence hits" without
// exposing raw floats on the CLI.
var severityThreshold = map[string]float64{
	"error":   0.9,
	"warning": 0.7,
	"info":    0.0,
}

type validateCommand struct{}

// New returns the `lsp validate` command.
func New() cli.Command { return &validateCommand{} }

func (c *validateCommand) Name() string { return "lsp validate" }
func (c *validateCommand) Description() string {
	return "Validate a manuscript via the detect pipeline"
}

// entityResult is the JSON-serialisable shape of a single detected entity.
type entityResult struct {
	File       string  `json:"file"`
	Line       int     `json:"line"`
	Type       string  `json:"type"`
	ID         string  `json:"id"`
	Confidence float64 `json:"confidence"`
}

func (c *validateCommand) Handle(cctx cli.CommandContext) int {
	file := ""
	severity := ""
	args := cctx.Args

	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--file":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--file requires a value")
				return 1
			}
			file = args[i+1]
			i++
		case strings.HasPrefix(a, "--file="):
			file = strings.TrimPrefix(a, "--file=")
		case a == "--severity":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--severity requires a value")
				return 1
			}
			severity = args[i+1]
			i++
		case strings.HasPrefix(a, "--severity="):
			severity = strings.TrimPrefix(a, "--severity=")
		case !strings.HasPrefix(a, "--") && file == "":
			// Why: accept the file path as a positional argument when --file is
			// not present, matching the documented `lsp validate <file>` usage.
			file = a
		}
	}

	// Validate severity flag value early for clear error messages.
	minScore := 0.0
	if severity != "" {
		thresh, ok := severityThreshold[severity]
		if !ok {
			cctx.Presenter.ShowError(fmt.Sprintf("unknown --severity %q (valid: error, warning, info)", severity))
			return 1
		}
		minScore = thresh
	}

	if file == "" {
		cctx.Presenter.ShowError("--file is required")
		return 1
	}

	// Why: check file existence before calling the service so we can return
	// exit code 2 (file-not-found) distinct from exit code 1 (runtime error),
	// matching POSIX convention used by tools like grep.
	if _, err := os.Stat(file); errors.Is(err, os.ErrNotExist) {
		cctx.Presenter.ShowError(fmt.Sprintf("file not found: %s", file))
		return 2
	}

	// Why: delegate file-read + DetectionRequest construction to ValidateService
	// instead of duplicating os.ReadFile + detect.Detect here.
	results, err := service.NewValidateService().Run(file)
	if err != nil {
		if errors.Is(err, service.ErrEmptyPath) {
			cctx.Presenter.ShowError("--file is required")
		} else {
			cctx.Presenter.ShowError(fmt.Sprintf("validate: %v", err))
		}
		return 1
	}

	// Apply severity threshold filter.
	filtered := filterBySeverity(results, minScore)

	if cctx.GlobalOpts.JSON {
		return c.writeJSON(cctx, file, filtered)
	}
	return c.writeText(cctx, file, filtered)
}

func filterBySeverity(results []detect.DetectedEntity, minScore float64) []detect.DetectedEntity {
	if minScore <= 0.0 {
		return results
	}
	out := make([]detect.DetectedEntity, 0, len(results))
	for _, r := range results {
		if r.Score >= minScore {
			out = append(out, r)
		}
	}
	return out
}

func (c *validateCommand) writeText(cctx cli.CommandContext, file string, results []detect.DetectedEntity) int {
	cctx.Presenter.ShowInfo(fmt.Sprintf("%s: %d entities detected", file, len(results)))
	for _, e := range results {
		line := e.Location.Range.Start.Line + 1 // convert 0-based to 1-based for display
		cctx.Presenter.ShowInfo(fmt.Sprintf(
			"  line=%d type=%s id=%s confidence=%.2f",
			line, e.Entity.Kind, e.Entity.ID, e.Score,
		))
	}
	return 0
}

func (c *validateCommand) writeJSON(cctx cli.CommandContext, file string, results []detect.DetectedEntity) int {
	out := make([]entityResult, 0, len(results))
	for _, e := range results {
		out = append(out, entityResult{
			File:       file,
			Line:       e.Location.Range.Start.Line + 1,
			Type:       string(e.Entity.Kind),
			ID:         e.Entity.ID,
			Confidence: e.Score,
		})
	}
	// Why: WriteJSON emits a single line; for the array case we pass the slice
	// directly so the output is a JSON array, not a stream of objects.
	if err := cctx.Presenter.WriteJSON(out); err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("json encode: %v", err))
		return 1
	}
	return 0
}
