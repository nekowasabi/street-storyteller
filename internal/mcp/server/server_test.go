package server

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/mcp/tools"
)

func runOneRequest(t *testing.T, fixtureName string, configure func(s *Server)) *protocol.Message {
	t.Helper()
	body, err := os.ReadFile(filepath.Join("testdata", "mcp", fixtureName))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var inBuf bytes.Buffer
	msg := &protocol.Message{}
	if err := json.Unmarshal(body, msg); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if err := protocol.Write(&inBuf, msg); err != nil {
		t.Fatalf("Write fixture: %v", err)
	}

	s := New(ServerOptions{Name: "test-server", Version: "0.0.1"})
	s.RegisterStandardHandlers()
	if configure != nil {
		configure(s)
	}

	var outBuf bytes.Buffer
	// Why: ignore Run's terminal io.EOF — Run loops until reader exhausts.
	_ = s.Run(context.Background(), &inBuf, &outBuf)

	resp, err := protocol.Read(&outBuf)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return resp
}

func TestServer_InitializeReturnsServerInfo(t *testing.T) {
	resp := runOneRequest(t, "initialize.json", nil)
	if resp.Error != nil {
		t.Fatalf("error response: %+v", resp.Error)
	}
	var result protocol.InitializeResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if result.ServerInfo.Name != "test-server" {
		t.Errorf("serverInfo.name = %q", result.ServerInfo.Name)
	}
	if !strings.Contains(string(resp.Result), "capabilities") {
		t.Errorf("missing capabilities: %s", string(resp.Result))
	}
}

func TestServer_ToolsListReturnsRegistered(t *testing.T) {
	resp := runOneRequest(t, "tools_list.json", func(s *Server) {
		_ = s.Tools().Register(stubTool{})
	})
	if resp.Error != nil {
		t.Fatalf("error response: %+v", resp.Error)
	}
	var result protocol.ListToolsResult
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(result.Tools) != 1 || result.Tools[0].Name != "stub" {
		t.Errorf("unexpected tools: %+v", result.Tools)
	}
}

// stubTool is a fixed-shape Tool used by the server-level integration tests.
type stubTool struct{}

func (stubTool) Definition() protocol.Tool {
	return protocol.Tool{Name: "stub", InputSchema: json.RawMessage(`{}`)}
}
func (stubTool) Handle(_ context.Context, _ json.RawMessage, _ tools.ExecutionContext) (*protocol.CallToolResult, error) {
	return &protocol.CallToolResult{Content: []protocol.ContentBlock{{Type: "text", Text: "ok"}}}, nil
}
