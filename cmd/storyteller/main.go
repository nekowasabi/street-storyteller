package main

import (
	"context"
	"fmt"
	"os"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/cli/modules"
)

// runMain is the package-internal entry point. Exposed (lowercase but reachable
// from tests in the same package) so cmd/storyteller golden tests can drive
// the full CLI without spawning a subprocess.
//
// Argument contract (tests and golden files depend on this order):
//   - ctx  – controls cancellation; pass context.Background() from main()
//   - args – os.Args[1:] in production; arbitrary slices in tests
//   - deps – I/O streams; use cli.DefaultDeps() in production, inject
//     bytes.Buffer instances in tests
//
// Returns an OS exit code: 0 success, 1 runtime error, 2 invocation error.
//
// Why: in-process invocation gives the golden tests access to the same
// stdout/stderr buffers we use everywhere else and avoids requiring `go build`
// before tests run. The signature is intentionally stable — changing the order
// or types of (ctx, args, deps) requires updating both golden_test.go and any
// integration test that calls runMain directly.
func runMain(ctx context.Context, args []string, deps cli.Deps) int {
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		fmt.Fprintln(deps.Stderr, "registry:", err)
		return 2
	}
	return cli.RunWithRegistry(ctx, args, deps, r)
}

func main() {
	os.Exit(runMain(context.Background(), os.Args[1:], cli.DefaultDeps()))
}
