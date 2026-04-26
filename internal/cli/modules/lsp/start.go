package lsp

import (
	"context"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
	lspserver "github.com/takets/street-storyteller/internal/lsp/server"
)

type startCommand struct{}

func NewStart() cli.Command { return &startCommand{} }

func (c *startCommand) Name() string        { return "lsp start" }
func (c *startCommand) Description() string { return "Start the Go LSP server" }
func (c *startCommand) Usage() string       { return "storyteller lsp start --stdio" }

func (c *startCommand) Handle(cctx cli.CommandContext) int {
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
	s := lspserver.NewServer(lspserver.ServerOptions{})
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
