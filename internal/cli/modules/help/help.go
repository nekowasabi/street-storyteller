// Package help implements the `storyteller help` command.
package help

import (
	"github.com/takets/street-storyteller/internal/cli"
)

type helpCommand struct {
	reg cli.Registry
}

// New returns a help command bound to the given registry. The bound registry
// supplies the list of known commands; this couples help output to the actual
// dispatch table without rebuilding it.
func New(r cli.Registry) cli.Command {
	return &helpCommand{reg: r}
}

func (c *helpCommand) Name() string        { return "help" }
func (c *helpCommand) Description() string { return "List available commands" }

func (c *helpCommand) Handle(cctx cli.CommandContext) int {
	paths := c.reg.List()
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Commands []string `json:"commands"`
		}{Commands: paths})
		return 0
	}
	cctx.Presenter.ShowInfo("Available commands:")
	for _, p := range paths {
		cctx.Presenter.ShowInfo("  " + p)
	}
	return 0
}
