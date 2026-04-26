// Package view implements the `storyteller view character` command.
package view

import (
	"fmt"
	"os"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/project"
)

type characterCommand struct{}

// New returns the `view character` command.
func New() cli.Command { return &characterCommand{} }

func (c *characterCommand) Name() string        { return "view character" }
func (c *characterCommand) Description() string { return "Display a character entity" }

func (c *characterCommand) Handle(cctx cli.CommandContext) int {
	id := ""
	root := ""
	args := cctx.Args
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch {
		case a == "--id":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--id requires a value")
				return 1
			}
			id = args[i+1]
			i++
		case strings.HasPrefix(a, "--id="):
			id = strings.TrimPrefix(a, "--id=")
		case a == "--path":
			if i+1 >= len(args) {
				cctx.Presenter.ShowError("--path requires a value")
				return 1
			}
			root = args[i+1]
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
		// Why: also honour the global --path so users can omit per-command
		// --path when they have already supplied it globally.
		if cctx.GlobalOpts.Path != "" {
			root = cctx.GlobalOpts.Path
		} else {
			cwd, err := os.Getwd()
			if err != nil {
				cctx.Presenter.ShowError(fmt.Sprintf("getwd: %v", err))
				return 1
			}
			root = cwd
		}
	}

	proj, err := project.Load(root)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	ch, err := proj.Store.Character(id)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Role    string `json:"role"`
			Summary string `json:"summary"`
		}{ID: ch.ID, Name: ch.Name, Role: string(ch.Role), Summary: ch.Summary})
		return 0
	}
	cctx.Presenter.ShowInfo("name: " + ch.Name)
	cctx.Presenter.ShowInfo("role: " + string(ch.Role))
	cctx.Presenter.ShowInfo("summary: " + ch.Summary)
	return 0
}
