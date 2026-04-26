package textlint

import (
	"bytes"
	"context"
	"errors"
	"time"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/testkit/clock"
	"github.com/takets/street-storyteller/internal/testkit/process"
)

// defaultTimeout caps a single textlint invocation. Mirrors the LSP debounce
// budget documented in docs/lint.md.
const defaultTimeout = 30 * time.Second

// RealWorker shells out to `npx textlint --stdin` to obtain diagnostics.
//
// Why: process.Runner instead of os/exec direct — keeps tests deterministic
// without spawning the real textlint binary (FakeRunner replaces the runner).
type RealWorker struct {
	runner  process.Runner
	clock   clock.Clock
	timeout time.Duration
}

// Compile-time interface assertion.
var _ Worker = (*RealWorker)(nil)

// NewRealWorker constructs a RealWorker with the default 30s timeout.
func NewRealWorker(r process.Runner, c clock.Clock) *RealWorker {
	return &RealWorker{runner: r, clock: c, timeout: defaultTimeout}
}

// Lint runs textlint over the given content piped via stdin. The filePath is
// passed via --stdin-filename for rule attribution. Exit code 127 is treated
// as "textlint not installed" and returns (nil, nil) so callers can degrade
// gracefully (storyteller diagnostics still flow).
func (w *RealWorker) Lint(ctx context.Context, filePath string, content []byte) ([]Message, error) {
	cctx, cancel := context.WithTimeout(ctx, w.timeout)
	defer cancel()

	args := []string{
		"textlint",
		"--stdin",
		"--stdin-filename", filePath,
		"--format", "json",
	}
	res, err := w.runner.Run(cctx, "npx", args, bytes.NewReader(content))
	if err != nil {
		// Why: distinguish ctx cancel from spawn failure for clearer ops logs.
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			return nil, apperrors.Wrap(err, apperrors.CodeIO, "textlint cancelled")
		}
		return nil, apperrors.Wrap(err, apperrors.CodeIO, "textlint exec")
	}
	// 127 = npx couldn't find textlint.
	if res.ExitCode == 127 {
		return nil, nil
	}
	// textlint exits 0 (clean) or 1 (issues found); both have valid JSON on stdout.
	return Parse(res.Stdout)
}
