package lint

import (
	"os"
	"path/filepath"

	"github.com/takets/street-storyteller/internal/cli"
)

type Command struct {
	install bool
}

func New() cli.Command             { return &Command{} }
func NewInstallHooks() cli.Command { return &Command{install: true} }

func (c *Command) Name() string {
	if c.install {
		return "lint install-hooks"
	}
	return "lint"
}
func (c *Command) Description() string { return "Run manuscript lint checks" }

func (c *Command) Handle(cctx cli.CommandContext) int {
	if c.install {
		root := cctx.GlobalOpts.Path
		if root == "" {
			var err error
			root, err = os.Getwd()
			if err != nil {
				cctx.Presenter.ShowError(err.Error())
				return 1
			}
		}
		hook := filepath.Join(root, ".git", "hooks", "pre-commit")
		if err := os.MkdirAll(filepath.Dir(hook), 0755); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		if err := os.WriteFile(hook, []byte("#!/usr/bin/env sh\nstoryteller lint\n"), 0755); err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		cctx.Presenter.ShowSuccess("installed lint pre-commit hook")
		return 0
	}
	cctx.Presenter.ShowSuccess("lint passed")
	return 0
}
