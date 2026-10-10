package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/cli"
)

// Why: process-101. start --stdio はサーバーループに入るため
// 単体では動かしづらい。代わりに init / 引数欠落 / Name/Usage を smoke test。

func TestMCP_InitSuccess(t *testing.T) {
	cmd := NewInit()
	if cmd.Name() != "mcp init" {
		t.Errorf("Name = %q", cmd.Name())
	}
	if cmd.Description() == "" {
		t.Errorf("Description empty")
	}
	var out, errBuf bytes.Buffer
	cctx := cli.CommandContext{
		Ctx:       context.Background(),
		Args:      nil,
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	}
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "mcp configuration") {
		t.Errorf("unexpected output: %q", out.String())
	}
}

func TestMCP_StartRequiresStdio(t *testing.T) {
	cmd := NewStart()
	if cmd.Name() != "mcp start" {
		t.Errorf("Name = %q", cmd.Name())
	}
	if u, ok := cmd.(interface{ Usage() string }); !ok || !strings.Contains(u.Usage(), "start") {
		t.Errorf("Usage missing")
	}
	var out, errBuf bytes.Buffer
	cctx := cli.CommandContext{
		Ctx:       context.Background(),
		Args:      nil, // no --stdio
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf},
	}
	if code := cmd.Handle(cctx); code != 1 {
		t.Fatalf("exit=%d want 1", code)
	}
	if !strings.Contains(errBuf.String(), "--stdio") {
		t.Errorf("missing --stdio error: %q", errBuf.String())
	}
}

func TestMCP_StartStdioImmediateClose(t *testing.T) {
	// Why: --stdio で起動したサーバーは Stdin EOF で即終了する。
	// 2 秒タイムアウト未満で完了することを確認。
	cmd := NewStart()
	var out, errBuf bytes.Buffer
	stdin := bytes.NewReader(nil) // EOF immediately
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cctx := cli.CommandContext{
		Ctx:       ctx,
		Args:      []string{"--stdio"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf, Stdin: stdin},
	}
	if code := cmd.Handle(cctx); code != 0 {
		t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
	}
}

func TestMCP_StartStdioSequentialRequests(t *testing.T) {
	stdin, input := io.Pipe()
	output, stdout := io.Pipe()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer stdin.Close()
	defer input.Close()
	defer output.Close()
	defer stdout.Close()
	var errBuf bytes.Buffer
	done := make(chan int, 1)
	go func() {
		done <- NewStart().Handle(cli.CommandContext{
			Ctx: ctx, Args: []string{"--stdio"},
			Presenter: cli.NewTextPresenter(stdout, &errBuf),
			Deps:      cli.Deps{Stdin: stdin, Stdout: stdout, Stderr: &errBuf},
		})
	}()
	exchanged := make(chan error, 1)
	go func() {
		decoder := json.NewDecoder(output)
		for i, request := range []string{
			`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}`,
			`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`,
		} {
			if _, err := fmt.Fprintln(input, request); err != nil {
				exchanged <- err
				return
			}
			var response struct {
				ID     int             `json:"id"`
				Result json.RawMessage `json:"result"`
				Error  json.RawMessage `json:"error"`
			}
			if err := decoder.Decode(&response); err != nil {
				exchanged <- err
				return
			}
			if response.ID != i+1 || len(response.Result) == 0 || len(response.Error) != 0 {
				exchanged <- fmt.Errorf("response = %+v, want successful id=%d", response, i+1)
				return
			}
		}
		exchanged <- input.Close()
	}()
	select {
	case err := <-exchanged:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("sequential requests did not receive both responses")
	}
	select {
	case code := <-done:
		if code != 0 {
			t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("did not return after stdin close")
	}
}

func TestMCP_StartStdioStaysOpenUntilEOF(t *testing.T) {
	cmd := NewStart()
	r, w := io.Pipe()
	defer r.Close()
	var out, errBuf bytes.Buffer
	cctx := cli.CommandContext{
		Ctx:       context.Background(),
		Args:      []string{"--stdio"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf, Stdin: r},
	}
	done := make(chan int, 1)
	go func() { done <- cmd.Handle(cctx) }()
	select {
	case code := <-done:
		t.Fatalf("returned %d before stdin closed; stderr=%q", code, errBuf.String())
	case <-time.After(2200 * time.Millisecond):
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case code := <-done:
		if code != 0 {
			t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("did not return after stdin close")
	}
}

func TestMCP_StartStdioCancelWhileStdinOpen(t *testing.T) {
	cmd := NewStart()
	r, w := io.Pipe()
	defer w.Close()
	defer r.Close()
	ctx, cancel := context.WithCancel(context.Background())
	var out, errBuf bytes.Buffer
	cctx := cli.CommandContext{
		Ctx:       ctx,
		Args:      []string{"--stdio"},
		Presenter: cli.NewTextPresenter(&out, &errBuf),
		Deps:      cli.Deps{Stdout: &out, Stderr: &errBuf, Stdin: r},
	}
	done := make(chan int, 1)
	go func() { done <- cmd.Handle(cctx) }()
	// Why: time.Sleep is banned in default-tag tests. Cancel is already set
	// before Run blocks on stdin, so the server returns on ctx.Done.
	cancel()
	select {
	case code := <-done:
		if code != 0 {
			t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("cancel did not return while stdin stayed open")
	}
}
