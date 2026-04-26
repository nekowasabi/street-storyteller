package lsp

import "github.com/takets/street-storyteller/internal/cli"

type installCommand struct{}

func NewInstall() cli.Command { return &installCommand{} }

func (c *installCommand) Name() string        { return "lsp install" }
func (c *installCommand) Description() string { return "Print editor setup for the Go LSP server" }
func (c *installCommand) Usage() string       { return "storyteller lsp install <nvim|vscode>" }

func (c *installCommand) Handle(cctx cli.CommandContext) int {
	editor := "nvim"
	if len(cctx.Args) > 0 {
		editor = cctx.Args[0]
	}
	if cctx.GlobalOpts.JSON {
		_ = cctx.Presenter.WriteJSON(struct {
			Editor  string `json:"editor"`
			Command string `json:"command"`
		}{Editor: editor, Command: "storyteller lsp start --stdio"})
		return 0
	}
	cctx.Presenter.ShowInfo("command: storyteller lsp start --stdio")
	return 0
}
