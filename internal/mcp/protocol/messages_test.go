package protocol

import (
	"encoding/json"
	"testing"
)

func TestInitializeRoundTrip(t *testing.T) {
	in := InitializeParams{
		ProtocolVersion: "2024-11-05",
		ClientInfo:      ClientInfo{Name: "claude", Version: "0.1"},
	}
	b, err := json.Marshal(in)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out InitializeParams
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out.ProtocolVersion != "2024-11-05" {
		t.Errorf("protocolVersion = %q", out.ProtocolVersion)
	}
	if out.ClientInfo.Name != "claude" {
		t.Errorf("clientInfo.name = %q", out.ClientInfo.Name)
	}
}

func TestListToolsResult_RoundTrip(t *testing.T) {
	in := ListToolsResult{Tools: []Tool{{Name: "ping", InputSchema: json.RawMessage(`{}`)}}}
	b, err := json.Marshal(in)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out ListToolsResult
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(out.Tools) != 1 || out.Tools[0].Name != "ping" {
		t.Errorf("unexpected tools: %+v", out.Tools)
	}
}

func TestCallToolResult_HasContentBlock(t *testing.T) {
	r := CallToolResult{Content: []ContentBlock{{Type: "text", Text: "ok"}}}
	b, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if want := `"content":[{"type":"text","text":"ok"}]`; !contains(string(b), want) {
		t.Errorf("expected substring %q in %s", want, string(b))
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
