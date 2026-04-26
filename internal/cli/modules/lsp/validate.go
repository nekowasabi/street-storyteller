// Package lsp implements the `storyteller lsp validate` command (stub).
//
// Why a stub: the full LSP integration depends on EntityCatalog wiring that
// will land in a later wave. The stub still exercises the detect API with a
// nil catalog so the command surface and exit semantics are stable for
// downstream consumers (golden tests, scripts).
package lsp

import (
	"errors"
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/service"
)

type validateCommand struct{}

// New returns the `lsp validate` command.
func New() cli.Command { return &validateCommand{} }

func (c *validateCommand) Name() string { return "lsp validate" }
func (c *validateCommand) Description() string {
	return "Validate a manuscript via the detect pipeline"
}

func (c *validateCommand) Handle(cctx cli.CommandContext) int {
	file := ""
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
		}
	}

	// Why: delegate file-read + DetectionRequest construction to ValidateService
	// instead of duplicating os.ReadFile + detect.Detect here. The adapter
	// becomes a thin presentation shell — matching the Refactor Phase goal.
	results, err := service.NewValidateService().Run(file)
	if err != nil {
		if errors.Is(err, service.ErrEmptyPath) {
			cctx.Presenter.ShowError("--file is required")
		} else {
			cctx.Presenter.ShowError(fmt.Sprintf("validate: %v", err))
		}
		return 1
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Detections int `json:"detections"`
		}{Detections: len(results)})
		return 0
	}
	cctx.Presenter.ShowInfo(fmt.Sprintf("%d detections", len(results)))
	return 0
}
