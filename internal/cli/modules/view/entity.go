package view

import (
	"bytes"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/project"
)

type entityCommand struct {
	kind string
}

func NewEntity(kind string) cli.Command { return &entityCommand{kind: kind} }

func (c *entityCommand) Name() string        { return "view " + c.kind }
func (c *entityCommand) Description() string { return "Display a " + c.kind + " entity" }
func (c *entityCommand) Usage() string {
	return "storyteller view " + c.kind + " --id <id> [--path <project>] [--format html] [--output <file>]"
}

func (c *entityCommand) Handle(cctx cli.CommandContext) int {
	id, format, output := "", "", ""
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
		case a == "--format" || a == "--output":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError(a + " requires a value")
				return 1
			}
			if a == "--format" {
				format = cctx.Args[i+1]
			} else {
				output = cctx.Args[i+1]
			}
			i++
		case strings.HasPrefix(a, "--format="):
			format = strings.TrimPrefix(a, "--format=")
		case strings.HasPrefix(a, "--output="):
			output = strings.TrimPrefix(a, "--output=")
		}
	}
	if id == "" {
		cctx.Presenter.ShowError("--id is required")
		return 1
	}
	if format != "" && format != "html" {
		cctx.Presenter.ShowError("unsupported --format: " + format + " (supported: html)")
		return 1
	}
	if output != "" && format != "html" {
		cctx.Presenter.ShowError("--output requires --format html")
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
	if format == "html" {
		var buf bytes.Buffer
		if err := writeEntityHTML(&buf, c.kind, row); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		if output == "" {
			_, _ = cctx.Deps.Stdout.Write(buf.Bytes())
			return 0
		}
		if err := os.WriteFile(output, buf.Bytes(), 0o644); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		cctx.Presenter.ShowSuccess("wrote " + output)
		return 0
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
	// Events is set for timelines only.
	Events []domain.TimelineEvent `json:"events,omitempty"`
	items  []htmlItem
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
		evs := append([]domain.TimelineEvent(nil), v.Events...)
		sort.SliceStable(evs, func(i, j int) bool { return evs[i].Time.Order < evs[j].Time.Order })
		items := make([]htmlItem, 0, len(evs))
		for _, e := range evs {
			meta := fmt.Sprintf("#%d %s", e.Time.Order, e.Category)
			if e.Time.Label != nil {
				meta += " " + *e.Time.Label
			}
			if len(e.Characters) > 0 {
				meta += " / " + strings.Join(e.Characters, ", ")
			}
			items = append(items, htmlItem{Title: e.Title, Meta: meta, Summary: e.Summary})
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary, Events: evs, items: items}, nil
	case "foreshadowing":
		v, err := proj.Store.Foreshadowing(id)
		if err != nil {
			return summaryRow{}, err
		}
		items := []htmlItem{{Title: "設置 " + v.Planting.Chapter, Meta: string(v.Status), Summary: v.Planting.Description}}
		for _, r := range v.Resolutions {
			items = append(items, htmlItem{Title: "回収 " + r.Chapter, Meta: fmt.Sprintf("%.0f%%", r.Completeness*100), Summary: r.Description})
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary, items: items}, nil
	case "plot":
		v, err := proj.Store.Plot(id)
		if err != nil {
			return summaryRow{}, err
		}
		items := make([]htmlItem, 0, len(v.Beats))
		for _, b := range v.Beats {
			items = append(items, htmlItem{Title: b.Title, Meta: string(b.StructurePosition), Summary: b.Summary})
		}
		return summaryRow{ID: v.ID, Name: v.Name, Summary: v.Summary, items: items}, nil
	default:
		return summaryRow{}, fmt.Errorf("unsupported view kind: %s", kind)
	}
}
