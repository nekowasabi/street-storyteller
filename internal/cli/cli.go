package cli

import (
	"context"
	"fmt"
	"os"
)

// DefaultDeps returns Deps wired to the real OS streams.
func DefaultDeps() Deps {
	return Deps{
		Stdout: os.Stdout,
		Stderr: os.Stderr,
		Stdin:  os.Stdin,
	}
}

// Run is the CLI entrypoint with an empty registry. It only handles the
// implicit "no-args -> nothing to do" path; real applications should use
// RunWithRegistry with a populated Registry.
//
// Why: cli core cannot import internal/cli/modules without creating an import
// cycle (modules depend on cli). The cmd/storyteller binary therefore
// composes the registry and calls RunWithRegistry.
func Run(ctx context.Context, args []string, deps Deps) int {
	return RunWithRegistry(ctx, args, deps, NewRegistry())
}

// RunWithRegistry executes the CLI dispatch loop using the supplied registry.
// Returns an exit code: 0 success, 1 user/runtime error, 2 invocation error
// (unknown command etc.).
func RunWithRegistry(ctx context.Context, args []string, deps Deps, r Registry) int {
	opts, rem, err := ParseGlobalOptions(args)
	if err != nil {
		fmt.Fprintln(deps.Stderr, err.Error())
		return 2
	}

	presenter := selectPresenter(opts, deps)

	// No tokens: dispatch to "help" if registered, else exit 0 silently.
	if len(rem) == 0 {
		if cmd, _, ok := r.Resolve([]string{"help"}); ok {
			return cmd.Handle(CommandContext{
				Ctx:        ctx,
				Args:       nil,
				Presenter:  presenter,
				Deps:       deps,
				GlobalOpts: opts,
			})
		}
		return 0
	}

	cmd, sub, ok := r.Resolve(rem)
	if !ok {
		fmt.Fprintf(deps.Stderr, "unknown command: %s\n", rem[0])
		return 2
	}
	return cmd.Handle(CommandContext{
		Ctx:        ctx,
		Args:       sub,
		Presenter:  presenter,
		Deps:       deps,
		GlobalOpts: opts,
	})
}

// selectPresenter returns a JSON or Text presenter based on opts.
//
// Why: a single helper keeps the conditional in one spot. Sub-commands receive
// a presenter regardless of mode and can simply call ShowX / WriteJSON.
func selectPresenter(opts GlobalOptions, deps Deps) Presenter {
	if opts.JSON {
		return NewJSONPresenter(deps.Stdout)
	}
	return NewTextPresenter(deps.Stdout, deps.Stderr)
}
