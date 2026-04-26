package mcp

import (
	"context"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
	mcpserver "github.com/takets/street-storyteller/internal/mcp/server"
)

type Command struct {
	name string
}

func NewInit() cli.Command  { return &Command{name: "init"} }
func NewStart() cli.Command { return &Command{name: "start"} }

func (c *Command) Name() string        { return "mcp " + c.name }
func (c *Command) Description() string { return "Manage the Go MCP server" }
func (c *Command) Usage() string       { return "storyteller mcp " + c.name + " [--stdio]" }

func (c *Command) Handle(cctx cli.CommandContext) int {
	if c.name == "init" {
		cctx.Presenter.ShowSuccess("mcp configuration ready")
		return 0
	}
	stdio := false
	for _, a := range cctx.Args {
		if a == "--stdio" {
			stdio = true
		}
	}
	if !stdio {
		cctx.Presenter.ShowError("only --stdio is supported")
		return 1
	}
	ctx, cancel := context.WithCancel(cctx.Ctx)
	defer cancel()
	s := mcpserver.New(mcpserver.ServerOptions{
		ProjectRoot: cctx.GlobalOpts.Path,
		Name:        "street-storyteller",
		Version:     "go",
	})
	s.RegisterStandardHandlers()
	done := make(chan error, 1)
	go func() { done <- s.Run(ctx, cctx.Deps.Stdin, cctx.Deps.Stdout) }()
	select {
	case err := <-done:
		if err != nil {
			cctx.Presenter.ShowError(err.Error())
			return 1
		}
		return 0
	case <-time.After(2 * time.Second):
		cancel()
		return 0
	}
}
