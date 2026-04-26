// Package cli provides the storyteller command-line interface skeleton and
// shared contracts. Implementations live under modules/.
package cli

import (
	"context"
	"io"
)

// Deps groups injectable dependencies for the CLI runtime. Keep small;
// large fan-out belongs in CommandContext.
type Deps struct {
	Stdout io.Writer
	Stderr io.Writer
	Stdin  io.Reader
}

// DefaultDeps returns Deps wired to os.Stdout/Stderr/Stdin.
// Implementation is in cli.go (Wave-main WT-1).
func DefaultDeps() Deps { return Deps{} }

// Run is the CLI entrypoint. It parses args, dispatches to a Command, and
// returns an exit code (0 success, 1 user error, 2 internal error).
// Implementation is in cli.go (Wave-main WT-1).
func Run(ctx context.Context, args []string, deps Deps) int { return 0 }

// Presenter abstracts text vs JSON output. Implementations: TextPresenter, JSONPresenter.
type Presenter interface {
	ShowInfo(msg string)
	ShowSuccess(msg string)
	ShowWarning(msg string)
	ShowError(msg string)
	WriteJSON(payload any) error
}

// CommandContext is passed to every Command.Handle.
type CommandContext struct {
	Ctx        context.Context
	Args       []string
	Presenter  Presenter
	Deps       Deps
	GlobalOpts GlobalOptions
}

// GlobalOptions holds flags valid across all subcommands.
type GlobalOptions struct {
	JSON    bool
	Path    string
	Verbose bool
}

// Command describes a single (sub)command.
type Command interface {
	Name() string
	Description() string
	Handle(cctx CommandContext) int
}

// Registry stores commands and resolves "<group> <sub> ..." paths.
// Implementation is in registry.go (Wave-main WT-1).
type Registry interface {
	Register(path string, cmd Command) error
	Resolve(args []string) (cmd Command, remaining []string, ok bool)
	List() []string
}
