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
