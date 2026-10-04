package server

import (
	"context"
	"strings"
	"testing"
)

// Claude Code's stdio handshake: newline-delimited JSON, one message per line.
func TestServer_NewlineDelimitedHandshake(t *testing.T) {
	in := strings.NewReader(
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"claude-code","version":"1"}}}` + "\n" +
			`{"jsonrpc":"2.0","method":"notifications/initialized"}` + "\n" +
			`{"jsonrpc":"2.0","id":2,"method":"tools/list"}` + "\n")
	var out strings.Builder

	s := New(ServerOptions{Name: "test-server", Version: "0.0.1"})
	s.RegisterStandardHandlers()
	if err := s.Run(context.Background(), in, &out); err != nil {
		t.Fatalf("Run: %v", err)
	}

	lines := strings.Split(strings.TrimSuffix(out.String(), "\n"), "\n")
	if len(lines) != 2 {
		t.Fatalf("got %d response lines, want 2:\n%s", len(lines), out.String())
	}
	if !strings.HasPrefix(lines[0], `{"jsonrpc":"2.0","id":1,"result":{`) {
		t.Errorf("line 1 = %s", lines[0])
	}
	if !strings.HasPrefix(lines[1], `{"jsonrpc":"2.0","id":2,"result":{"tools":[`) {
		t.Errorf("line 2 = %s", lines[1])
	}
}
