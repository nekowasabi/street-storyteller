package view

import (
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/project"
)

type listCommand struct{}

func NewList() cli.Command { return &listCommand{} }

func (c *listCommand) Name() string        { return "view list" }
func (c *listCommand) Description() string { return "List project entities" }
func (c *listCommand) Usage() string {
	return "storyteller view list --kind <characters|settings|timelines|foreshadowings|subplots> [--path <project>]"
}

func (c *listCommand) Handle(cctx cli.CommandContext) int {
	root, kind, ok := parseViewCommon(cctx, true)
	if !ok {
		return 1
	}
	proj, err := project.Load(root)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	rows := listRows(proj, kind)
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Kind  string   `json:"kind"`
			Items []string `json:"items"`
		}{Kind: kind, Items: rows})
		return 0
	}
	for _, row := range rows {
		cctx.Presenter.ShowInfo(row)
	}
	return 0
}

func listRows(proj *project.Project, kind string) []string {
	switch normalizeKind(kind) {
	case "characters":
		out := make([]string, 0, len(proj.Store.AllCharacters()))
		for _, v := range proj.Store.AllCharacters() {
			out = append(out, fmt.Sprintf("%s\t%s", v.ID, v.Name))
		}
		return out
	case "settings":
		out := make([]string, 0, len(proj.Store.AllSettings()))
		for _, v := range proj.Store.AllSettings() {
			out = append(out, fmt.Sprintf("%s\t%s", v.ID, v.Name))
		}
		return out
	case "timelines":
		out := make([]string, 0, len(proj.Store.AllTimelines()))
		for _, v := range proj.Store.AllTimelines() {
			out = append(out, fmt.Sprintf("%s\t%s", v.ID, v.Name))
		}
		return out
	case "foreshadowings":
		out := make([]string, 0, len(proj.Store.AllForeshadowings()))
		for _, v := range proj.Store.AllForeshadowings() {
			out = append(out, fmt.Sprintf("%s\t%s", v.ID, v.Name))
		}
		return out
	case "subplots":
		out := make([]string, 0, len(proj.Store.AllSubplots()))
		for _, v := range proj.Store.AllSubplots() {
			out = append(out, fmt.Sprintf("%s\t%s", v.ID, v.Name))
		}
		return out
	default:
		return []string{}
	}
}

func parseViewCommon(cctx cli.CommandContext, requireKind bool) (root, kind string, ok bool) {
	root = cctx.GlobalOpts.Path
	for i := 0; i < len(cctx.Args); i++ {
		a := cctx.Args[i]
		switch {
		case a == "--path":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError("--path requires a value")
				return "", "", false
			}
			root = cctx.Args[i+1]
			i++
		case strings.HasPrefix(a, "--path="):
			root = strings.TrimPrefix(a, "--path=")
		case a == "--kind":
			if i+1 >= len(cctx.Args) {
				cctx.Presenter.ShowError("--kind requires a value")
				return "", "", false
			}
			kind = cctx.Args[i+1]
			i++
		case strings.HasPrefix(a, "--kind="):
			kind = strings.TrimPrefix(a, "--kind=")
		}
	}
	if root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return "", "", false
		}
		root = cwd
	}
	if requireKind && kind == "" {
		cctx.Presenter.ShowError("--kind is required")
		return "", "", false
	}
	return root, kind, true
}

func normalizeKind(kind string) string {
	switch kind {
	case "character":
		return "characters"
	case "setting":
		return "settings"
	case "timeline":
		return "timelines"
	case "foreshadowing":
		return "foreshadowings"
	case "subplot":
		return "subplots"
	default:
		return kind
	}
}
