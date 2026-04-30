package mcp

import (
	"context"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
	mcpserver "github.com/takets/street-storyteller/internal/mcp/server"
	"github.com/takets/street-storyteller/internal/mcp/tools"
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
	registerTools(s)
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

// registerTools wires every concrete MCP tool into the server's registry.
//
// Why centralized: keeping the canonical tool list in one place avoids
// drift between production server, golden_wire_test, and docs. New tools
// must be appended here so `tools/list` advertises the full surface.
func registerTools(s *mcpserver.Server) {
	r := s.Tools()
	// Existing tools.
	_ = r.Register(tools.MetaCheckTool{})
	_ = r.Register(tools.LSPValidateTool{})
	_ = r.Register(tools.ViewBrowserTool{})
	// Process 06 — timeline / event.
	_ = r.Register(tools.TimelineCreateTool{})
	_ = r.Register(tools.TimelineViewTool{})
	_ = r.Register(tools.TimelineAnalyzeTool{})
	_ = r.Register(tools.EventCreateTool{})
	_ = r.Register(tools.EventUpdateTool{})
	// Process 06 — plot.
	_ = r.Register(tools.PlotCreateTool{})
	_ = r.Register(tools.PlotViewTool{})
	_ = r.Register(tools.BeatCreateTool{})
	_ = r.Register(tools.IntersectionCreateTool{})
	// Process 06 — foreshadowing.
	_ = r.Register(tools.ForeshadowingCreateTool{})
	_ = r.Register(tools.ForeshadowingViewTool{})
	// Process 06 — manuscript & meta & element.
	_ = r.Register(tools.ManuscriptBindingTool{})
	_ = r.Register(tools.MetaGenerateTool{})
	_ = r.Register(tools.ElementCreateTool{})
	// Process 06 — LSP find references.
	_ = r.Register(tools.LSPFindReferencesTool{})
}
