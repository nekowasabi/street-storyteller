package textlint

import (
	"context"
	"fmt"

	"github.com/takets/street-storyteller/internal/testkit/process"
)

// IsAvailable probes whether textlint is reachable via npx by running
// `npx textlint --version`. Returns (true, "") on success, or (false, reason)
// when the command is absent or fails.
//
// Why: dependency-inject runner instead of hard-coding os/exec so that unit
// tests can supply a FakeRunner without spawning a real process.
func IsAvailable(ctx context.Context, r process.Runner) (bool, string) {
	res, err := r.Run(ctx, "npx", []string{"textlint", "--version"}, nil)
	if err != nil {
		return false, fmt.Sprintf("textlint not available: %v", err)
	}
	if res.ExitCode == 127 {
		return false, "textlint not installed: command not found (exit 127)"
	}
	if res.ExitCode != 0 {
		return false, fmt.Sprintf("textlint not available: exit %d", res.ExitCode)
	}
	return true, ""
}
