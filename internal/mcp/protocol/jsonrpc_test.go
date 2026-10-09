package protocol

import (
	"bufio"
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestRead_ParsesNewlineDelimited(t *testing.T) {
	r := bufio.NewReader(strings.NewReader("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}\n{\"jsonrpc\":\"2.0\",\"method\":\"ping\"}\n"))
	for _, want := range []string{"initialize", "ping"} {
		msg, err := Read(r)
		if err != nil {
			t.Fatalf("Read: %v", err)
		}
		if msg.Method != want {
			t.Errorf("method = %q, want %q", msg.Method, want)
		}
	}
}

func TestRead_RejectsNonJSONLine(t *testing.T) {
	if _, err := Read(strings.NewReader("Content-Length: 2\r\n\r\n{}")); err == nil {
		t.Fatal("expected error for non-JSON line, got nil")
	}
}

func TestWrite_RoundTrip(t *testing.T) {
	original := &Message{JSONRPC: "2.0", Method: "ping"}
	var buf bytes.Buffer
	if err := Write(&buf, original); err != nil {
		t.Fatalf("Write: %v", err)
	}
	got, err := Read(&buf)
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if got.Method != "ping" {
		t.Errorf("method = %q, want ping", got.Method)
	}
}

func TestNewRequest_ID(t *testing.T) {
	msg, err := NewRequest(42, "tools/list", map[string]string{"k": "v"})
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	if msg.JSONRPC != "2.0" {
		t.Errorf("jsonrpc = %q", msg.JSONRPC)
	}
	if msg.Method != "tools/list" {
		t.Errorf("method = %q", msg.Method)
	}
	var id int
	if err := json.Unmarshal(msg.ID, &id); err != nil || id != 42 {
		t.Errorf("ID round-trip failed: %v / %d", err, id)
	}
}

func TestNewResponseIncludesNullResult(t *testing.T) {
	msg, err := NewResponse(json.RawMessage("1"), nil)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(msg)
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		t.Fatal(err)
	}
	if string(fields["result"]) != "null" {
		t.Fatalf("successful null response must include result:null, got %s", raw)
	}
	if _, ok := fields["error"]; ok {
		t.Fatalf("successful response contains an error: %s", raw)
	}
}
