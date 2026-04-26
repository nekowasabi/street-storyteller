package view

import (
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/project"
)

type entityCommand struct {
	kind string
}

func NewEntity(kind string) cli.Command { return &entityCommand{kind: kind} }

func (c *entityCommand) Name() string        { return "view " + c.kind }
func (c *entityCommand) Description() string { return "Display a " + c.kind + " entity" }
func (c *entityCommand) Usage() string {
	return "storyteller view " + c.kind + " --id <id> [--path <project>]"
}

func (c *entityCommand) Handle(cctx cli.CommandContext) int {
	id := ""
	root := cctx.GlobalOpts.Path
	for i := 0; i < len(cctx.Args); i++ {
		a := cctx.Args[i]
		switch {
		case a == "--id":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError("--id requires a value")
				return 1
			}
			id = cctx.Args[i+1]
			i++
		case strings.HasPrefix(a, "--id="):
			id = strings.TrimPrefix(a, "--id=")
		case a == "--path":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			root = cctx.Args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			root = strings.TrimPrefix(a, "--path=")
		}
	}
	if id == "" {
		cctx.Presenter.ShowError("--id is required")
		return 1
	}
	if root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		root = cwd
	}
	proj, err := project.Load(root)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	row, err := entitySummary(proj, c.kind, id)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(row)
		return 0
	}
	cctx.Presenter.ShowInfo("id: " + row.ID)
	cctx.Presenter.ShowInfo("name: " + row.Name)
	cctx.Presenter.ShowInfo("summary: " + row.Summary)
	return 0
}

type summaryRow struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Summary string `json:"summary"`
}

func entitySummary(proj *project.Project, kind, id string) (summaryRow, error) {
	switch kind {
	case "setting":
		v, err := proj.Store.Setting(id)
		if err != nil {
			return summaryRow{}, err
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary}, nil
	case "timeline":
		v, err := proj.Store.Timeline(id)
		if err != nil {
			return summaryRow{}, err
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary}, nil
	case "foreshadowing":
		v, err := proj.Store.Foreshadowing(id)
		if err != nil {
			return summaryRow{}, err
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary}, nil
	case "subplot":
		v, err := proj.Store.Subplot(id)
		if err != nil {
			return summaryRow{}, err
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary}, nil
	default:
		return summaryRow{}, fmt.Errorf("unsupported view kind: %s", kind)
	}
}
