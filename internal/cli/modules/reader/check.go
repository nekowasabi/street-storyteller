// Package reader implements the `storyteller reader check` command.
package reader

import (
	"fmt"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/service"
)

const defaultManuscriptsDir = "./manuscripts"

type checkCommand struct{}

// New returns the `reader check` command.
func New() cli.Command { return &checkCommand{} }

func (c *checkCommand) Name() string { return "reader check" }
func (c *checkCommand) Description() string {
	return "Compare reader observations with the body's shows markers (storyteller reader check --path <manuscripts> --observations <tsv> [--main <file>])"
}

func (c *checkCommand) Handle(cctx cli.CommandContext) int {
	dir := cctx.GlobalOpts.Path
	if dir == "" {
		dir = defaultManuscriptsDir
	}
	flags := map[string]string{}
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		for _, name := range []string{"--observations", "--main"} {
			switch {
			case a == name:
				if i+1 >= len(args) {
					cctx.Presenter.ShowError(name + " requires a value")
					return 1
				}
				flags[name] = args[i+1]
				i++
			case strings.HasPrefix(a, name+"="):
				flags[name] = strings.TrimPrefix(a, name+"=")
			}
		}
	}
	if flags["--observations"] == "" {
		cctx.Presenter.ShowError("--observations is required")
		return 1
	}

	res, err := service.NewReaderCheckService().Run(dir, flags["--observations"], flags["--main"])
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	code := 0
	if res.MainFailed {
		code = 1
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			OK              bool                       `json:"ok"`
			ChaptersChecked int                        `json:"chapters_checked"`
			Findings        []service.ClarityViolation `json:"findings"`
			Matrix          []service.MatrixRow        `json:"matrix"`
			Stumbles        []service.Stumble          `json:"stumbles"`
		}{res.OK, res.ChaptersChecked, res.Findings, res.Matrix, res.Stumbles})
		return code
	}

	for _, v := range res.Findings {
		cctx.Presenter.ShowError(v.String())
	}
	counts := map[string]int{}
	for _, s := range res.Stumbles {
		counts[s.Box]++
	}
	for _, b := range service.Boxes {
		cctx.Presenter.ShowInfo(fmt.Sprintf("%s: %d", b, counts[b]))
	}
	summary := fmt.Sprintf("%d chapters, %d observations", res.ChaptersChecked, res.Observations)
	if len(res.Findings) == 0 {
		cctx.Presenter.ShowSuccess(summary)
	} else {
		cctx.Presenter.ShowInfo(summary)
	}
	return code
}
