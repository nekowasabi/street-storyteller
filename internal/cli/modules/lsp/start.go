package lsp

import (
	"context"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/cli"
	lspserver "github.com/takets/street-storyteller/internal/lsp/server"
)

type startCommand struct{}

func NewStart() cli.Command { return &startCommand{} }

func (c *startCommand) Name() string        { return "lsp start" }
func (c *startCommand) Description() string { return "Start the Go LSP server" }
func (c *startCommand) Usage() string       { return "storyteller lsp start --stdio" }

// Handle starts the stdio LSP server and keeps it alive until EOF, shutdown
// followed by client stream close, or parent context cancellation.
func (c *startCommand) Handle(cctx cli.CommandContext) int {
	stdio := false
	root := ""
	for i := 0; i < len(cctx.Args); i++ {
		a := cctx.Args[i]
		switch {
		case a == "--stdio":
			stdio = true
		case a == "--root" && i+1 < len(cctx.Args):
			i++
			root = cctx.Args[i]
		case strings.HasPrefix(a, "--root="):
			root = strings.TrimPrefix(a, "--root=")
		}
	}
	if !stdio {
		cctx.Presenter.ShowError("only --stdio is supported")
		return 1
	}
	ctx, cancel := context.WithCancel(cctx.Ctx)
	defer cancel()
	rootURI, err := resolveRootURI(root)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	opts, err := lspserver.NewServerOptions(ctx, rootURI)
	if err != nil {
		cctx.Presenter.ShowError(err.Error())
		return 1
	}
	opts.UseInitializeRoot = root == ""
	s := lspserver.NewServer(opts)
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
	case <-ctx.Done():
		cancel()
		return 0
	}
}

func resolveRootURI(root string) (string, error) {
	if root == "" {
		wd, err := os.Getwd()
		if err != nil {
			return "", err
		}
		root = wd
	}
	if strings.HasPrefix(root, "file://") {
		return root, nil
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	return (&url.URL{Scheme: "file", Path: abs}).String(), nil
}
