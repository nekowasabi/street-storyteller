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
func (c *checkCommand) Description() string { return "Validate manuscript frontmatter and Clarity" }

func (c *checkCommand) Handle(cctx cli.CommandContext) int {
	dir := cctx.GlobalOpts.Path
	if dir == "" {
		dir = defaultManuscriptsDir
	}
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
	return PresentMetaCheck(cctx, result)
}

// PresentMetaCheck prints a MetaCheckResult and returns the exit code. Shared
// with `manuscript build`, which runs the same check before copying.
func PresentMetaCheck(cctx cli.CommandContext, result service.MetaCheckResult) int {
	ok := len(result.Violations) == 0
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK           bool                       `json:"ok"`
			FilesChecked int                        `json:"files_checked"`
			Violations   []service.ClarityViolation `json:"violations,omitempty"`
		}{OK: ok, FilesChecked: result.FilesChecked, Violations: result.Violations})
		if ok {
			return 0
		}
		return 1
	}
	if !ok {
		for _, v := range result.Violations {
			cctx.Presenter.ShowError(v.String())
		}
		cctx.Presenter.ShowError(fmt.Sprintf("%d clarity violations", len(result.Violations)))
		return 1
	}
	cctx.Presenter.ShowSuccess(fmt.Sprintf("%d files validated", result.FilesChecked))
	return 0
}
