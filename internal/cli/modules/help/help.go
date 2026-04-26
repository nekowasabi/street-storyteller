// Package help implements the `storyteller help` command.
package help

import (
	"fmt"
	"strings"

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

// Handle renders the registered commands together with their Description and,
// when available, Usage. Paths come pre-sorted from the registry so the output
// is deterministic.
//
// Why: previously this method only emitted the path strings, leaving
// Command.Description() as a dead contract. Rendering Description here makes
// the interface load-bearing. CommandWithUsage is detected via type assertion
// (Optional interface pattern) so non-implementers fall back gracefully.
func (c *helpCommand) Handle(cctx cli.CommandContext) int {
	paths := c.reg.List()

	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Commands []string `json:"commands"`
		}{Commands: paths})
		return 0
	}

	cctx.Presenter.ShowInfo("Available commands:")
	if len(paths) == 0 {
		return 0
	}

	// Compute column width from the longest path so descriptions align.
	maxLen := 0
	for _, p := range paths {
		if len(p) > maxLen {
			maxLen = len(p)
		}
	}

	for _, p := range paths {
		cmd, _, ok := c.reg.Resolve([]string{p})
		// Why: defensive skip — List() and Resolve() should agree, but a
		// missing entry must not panic the help renderer.
		if !ok || cmd == nil {
			continue
		}
		desc := cmd.Description()
		// Why: Optional interface. Avoid forcing every Command to implement
		// Usage(); type assertion lets richer commands opt in without a
		// breaking change to the Command contract.
		var usage string
		if uc, ok := cmd.(cli.CommandWithUsage); ok {
			usage = uc.Usage()
		}

		line := fmt.Sprintf("  %-*s  %s", maxLen, p, desc)
		if usage != "" {
			line = strings.TrimRight(line, " ")
			line = fmt.Sprintf("%s (%s)", line, usage)
		}
		cctx.Presenter.ShowInfo(line)
	}
	return 0
}
