package protocol

import (
	"encoding/json"
	"strings"
	"testing"
)

func ptrInt32(v int32) *int32 { return &v }

func TestInitializeParams_RoundTrip(t *testing.T) {
	in := InitializeParams{
		ProcessID:    ptrInt32(1234),
		RootURI:      "file:///proj",
		Capabilities: json.RawMessage(`{}`),
	}
	raw, err := json.Marshal(in)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out InitializeParams
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out.ProcessID == nil || *out.ProcessID != 1234 {
		t.Errorf("ProcessID: got %v, want 1234", out.ProcessID)
	}
	if out.RootURI != "file:///proj" {
		t.Errorf("RootURI: got %q", out.RootURI)
	}
	if string(out.Capabilities) != `{}` {
		t.Errorf("Capabilities: got %s", out.Capabilities)
	}
}

func TestHoverResult_MarkdownSerialization(t *testing.T) {
	hr := HoverResult{Contents: MarkupContent{Kind: "markdown", Value: "**hero**"}}
	raw, err := json.Marshal(hr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	s := string(raw)
	if !strings.Contains(s, `"kind":"markdown"`) {
		t.Errorf("missing kind: %s", s)
	}
	if !strings.Contains(s, `"value":"**hero**"`) {
		t.Errorf("missing value: %s", s)
	}
}

func TestPublishDiagnosticsParams_RoundTrip(t *testing.T) {
	in := PublishDiagnosticsParams{
		URI: "file:///x.md",
		Diagnostics: []Diagnostic{
			{
				Range:    Range{Start: Position{Line: 0, Character: 1}, End: Position{Line: 0, Character: 4}},
				Severity: 1,
				Source:   "storyteller",
				Message:  "未解決の参照",
			},
		},
	}
	raw, err := json.Marshal(in)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out PublishDiagnosticsParams
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out.URI != in.URI {
		t.Errorf("URI mismatch: %q vs %q", out.URI, in.URI)
	}
	if len(out.Diagnostics) != 1 {
		t.Fatalf("Diagnostics len: got %d, want 1", len(out.Diagnostics))
	}
	got := out.Diagnostics[0]
	want := in.Diagnostics[0]
	if got.Range != want.Range {
		t.Errorf("Range mismatch: %+v vs %+v", got.Range, want.Range)
	}
	if got.Severity != want.Severity || got.Source != want.Source || got.Message != want.Message {
		t.Errorf("Diagnostic mismatch: got %+v want %+v", got, want)
	}
}
