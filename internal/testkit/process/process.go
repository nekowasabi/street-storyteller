package process

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os/exec"
	"sync"
)

// Result captures the outcome of a single external command execution.
type Result struct {
	Stdout   []byte
	Stderr   []byte
	ExitCode int
}

// Runner abstracts the execution of an external command so call sites can be
// exercised without spawning real processes during tests.
//
// Why: textlint や Deno の起動を直接 os/exec で書くと、テストが実プロセス起動に
// 依存して flaky/slow になる。Runner を介在させて FakeRunner で差し替えることで
// 決定論的なユニットテストを実現する。
type Runner interface {
	Run(ctx context.Context, name string, args []string, stdin io.Reader) (*Result, error)
}

// RealRunner executes commands via os/exec and is the production implementation.
type RealRunner struct{}

// Run invokes name with args under ctx. stdin (if non-nil) is piped to the
// child process. The returned Result is populated even when the child exits
// non-zero so callers can inspect stderr/stdout uniformly.
func (RealRunner) Run(ctx context.Context, name string, args []string, stdin io.Reader) (*Result, error) {
	// Why: CommandContext を採用 — ctx 経由のキャンセル/タイムアウトを LSP の
	// デバウンス処理から伝搬させたいため、Command(無context版)ではなく Context 版を使う。
	cmd := exec.CommandContext(ctx, name, args...)

	if stdin != nil {
		cmd.Stdin = stdin
	}
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()
	res := &Result{
		Stdout:   stdout.Bytes(),
		Stderr:   stderr.Bytes(),
		ExitCode: cmd.ProcessState.ExitCode(),
	}

	// Why: ExitError は ExitCode で表現できるため runErr を握りつぶして res で返す。
	// ただし起動失敗等の非 ExitError は呼び出し側で判別できるように err として返す。
	var exitErr *exec.ExitError
	if runErr != nil && !errors.As(runErr, &exitErr) {
		return res, runErr
	}
	return res, nil
}

// FakeCall records a single Run invocation against FakeRunner.
type FakeCall struct {
	Name  string
	Args  []string
	Stdin []byte
}

// FakeResponse is the canned response returned by FakeRunner.Run.
type FakeResponse struct {
	Stdout   []byte
	Stderr   []byte
	ExitCode int
	Err      error
}

// FakeRunner returns pre-registered responses in FIFO order and records every
// invocation for later inspection. It is concurrency-safe.
type FakeRunner struct {
	mu    sync.Mutex
	plans []FakeResponse
	calls []FakeCall
}

// NewFakeRunner constructs an empty FakeRunner.
func NewFakeRunner() *FakeRunner {
	return &FakeRunner{}
}

// Plan enqueues a response that will be returned by a future Run call.
func (f *FakeRunner) Plan(resp FakeResponse) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.plans = append(f.plans, resp)
}

// Run consumes the next planned response, records the invocation, and returns
// the Result. ErrFakeQueueExhausted is returned when no plan remains, so that
// over-call bugs in tests surface immediately rather than silently passing.
func (f *FakeRunner) Run(_ context.Context, name string, args []string, stdin io.Reader) (*Result, error) {
	stdinBytes, err := readStdin(stdin)
	if err != nil {
		return nil, err
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	// Why: 引数 args/stdin はそれぞれコピーして保存する。呼び出し側が後から
	// スライスを再利用しても履歴が破壊されないようにするため。
	argsCopy := append([]string(nil), args...)
	f.calls = append(f.calls, FakeCall{
		Name:  name,
		Args:  argsCopy,
		Stdin: stdinBytes,
	})

	if len(f.plans) == 0 {
		return nil, ErrFakeQueueExhausted
	}
	resp := f.plans[0]
	f.plans = f.plans[1:]

	res := &Result{
		Stdout:   resp.Stdout,
		Stderr:   resp.Stderr,
		ExitCode: resp.ExitCode,
	}
	return res, resp.Err
}

// Calls returns a snapshot of the recorded invocations in chronological order.
func (f *FakeRunner) Calls() []FakeCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]FakeCall, len(f.calls))
	copy(out, f.calls)
	return out
}

// ErrFakeQueueExhausted is returned by FakeRunner.Run when no planned response
// remains. Tests should Plan one response per expected Run call.
var ErrFakeQueueExhausted = errors.New("testkit/process: FakeRunner has no planned responses left")

func readStdin(r io.Reader) ([]byte, error) {
	if r == nil {
		return nil, nil
	}
	return io.ReadAll(r)
}
