// Package lsp implements the `storyteller lsp validate` command (stub).
//
// Why a stub: the full LSP integration depends on EntityCatalog wiring that
// will land in a later wave. The stub still exercises the detect API with a
// nil catalog so the command surface and exit semantics are stable for
// downstream consumers (golden tests, scripts).
package lsp

import (
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/detect"
)

type validateCommand struct{}

// New returns the `lsp validate` command.
func New() cli.Command { return &validateCommand{} }

func (c *validateCommand) Name() string        { return "lsp validate" }
func (c *validateCommand) Description() string { return "Validate a manuscript via the detect pipeline" }

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

	if file == "" {
		cctx.Presenter.ShowError("--file is required")
		return 1
	}

	data, err := os.ReadFile(file)
	if err != nil {
		cctx.Presenter.ShowError(fmt.Sprintf("read %s: %v", file, err))
		return 1
	}

	// Why: nil Catalog short-circuits the body scan in detect.Detect, so this
	// stub returns 0 detections on any input. A real catalog will be wired in
	// once internal/lsp graduates from skeleton.
	results := detect.Detect(detect.DetectionRequest{
		URI:     "file://" + file,
		Content: string(data),
		Catalog: nil,
	})

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Detections int `json:"detections"`
		}{Detections: len(results)})
		return 0
	}
	cctx.Presenter.ShowInfo(fmt.Sprintf("%d detections", len(results)))
	return 0
}
