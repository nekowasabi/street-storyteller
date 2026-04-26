// Package meta implements the `storyteller meta check` command.
package meta

import (
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/service"
)

const defaultManuscriptsDir = "./manuscripts"

type checkCommand struct{}

// New returns the `meta check` command.
func New() cli.Command { return &checkCommand{} }

func (c *checkCommand) Name() string        { return "meta check" }
func (c *checkCommand) Description() string { return "Validate manuscript frontmatter" }

func (c *checkCommand) Handle(cctx cli.CommandContext) int {
	dir := defaultManuscriptsDir
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--path":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			dir = args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			dir = strings.TrimPrefix(a, "--path=")
		}
	}

	// Why: delegate walk + parse to MetaCheckService instead of duplicating
	// collectMarkdown + meta.Parse here. The adapter becomes a thin presentation
	// shell — matching the Refactor Phase goal of eliminating CLI/MCP drift.
	result, err := service.NewMetaCheckService().Run(dir)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK           bool `json:"ok"`
			FilesChecked int  `json:"files_checked"`
		}{OK: true, FilesChecked: result.FilesChecked})
		return 0
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("%d files validated", result.FilesChecked))
	return 0
}
