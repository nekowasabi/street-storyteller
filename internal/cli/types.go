// Package cli provides the storyteller command-line interface skeleton and
// shared contracts. Implementations live under modules/.
package cli

import (
	"context"
	"io"
)

// Deps groups injectable dependencies for the CLI runtime. Keep small;
// large fan-out belongs in CommandContext.
//
// All fields must be non-nil at the point of CLI dispatch. Use DefaultDeps()
// for production and supply bytes.Buffer instances in tests. Passing nil will
// cause a nil-pointer panic in the presenter or error-printing paths.
type Deps struct {
	// Stdout receives normal command output (info, success messages, JSON payloads).
	// Must not be nil.
	Stdout io.Writer

	// Stderr receives error messages, warnings, and usage hints.
	// Routed here so callers can capture diagnostics independently of main output.
	// Must not be nil.
	Stderr io.Writer

	// Stdin is the input stream for commands that read user input interactively.
	// May be nil for commands that never read from stdin; the CLI core itself
	// does not read from Stdin.
	Stdin io.Reader
}

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
// Types that want richer help output may additionally implement CommandWithUsage.
type Command interface {
	Name() string
	Description() string
	Handle(cctx CommandContext) int
}

// CommandWithUsage は Command の Optional 拡張で、
// help renderer などが詳細な利用法を表示するために使われる。
// 全てのコマンドが実装する必要はなく、help renderer は型アサーションで
// 動的に判定する（fallback として Command.Description() を使用）。
//
// Why: Command interface への破壊的変更を避けつつ、help 表示の充実度を
// 段階的に向上させるため、Optional interface パターンを採用。
type CommandWithUsage interface {
	Command
	Usage() string
}

// Registry stores commands and resolves "<group> <sub> ..." paths.
// Implementation is in registry.go.
type Registry interface {
	Register(path string, cmd Command) error
	Resolve(args []string) (cmd Command, remaining []string, ok bool)
	List() []string
}
