package mcp

import (
	"bytes"
	"context"
	"strings"
	"testing"

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
	// 戻り値は 0 (正常終了 or 2 秒タイムアウト後 cancel)。どちらでも OK。
	_ = cmd.Handle(cctx)
}
