package protocol

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestRead_ParsesContentLengthFrame(t *testing.T) {
	body := `{"jsonrpc":"2.0","method":"x","id":1}`
	frame := "Content-Length: " + itoa(len(body)) + "\r\n\r\n" + body
	msg, err := Read(bytes.NewReader([]byte(frame)))
	if err != nil {
		t.Fatalf("Read returned error: %v", err)
	}
	if msg.JSONRPC != "2.0" {
		t.Errorf("JSONRPC: got %q, want %q", msg.JSONRPC, "2.0")
	}
	if msg.Method != "x" {
		t.Errorf("Method: got %q, want %q", msg.Method, "x")
	}
}

func TestRead_RejectsMissingContentLength(t *testing.T) {
	frame := "X-Other: 1\r\n\r\n{}"
	_, err := Read(bytes.NewReader([]byte(frame)))
	if err == nil {
		t.Fatal("expected error for missing Content-Length, got nil")
	}
	if !strings.Contains(err.Error(), "Content-Length") {
		t.Errorf("error should mention Content-Length: %v", err)
	}
}

func TestWrite_ProducesContentLengthFrame(t *testing.T) {
	msg := &Message{JSONRPC: "2.0", Method: "ping", ID: json.RawMessage("7")}
	var buf bytes.Buffer
	if err := Write(&buf, msg); err != nil {
		t.Fatalf("Write returned error: %v", err)
	}
	out := buf.String()
	idx := strings.Index(out, "\r\n\r\n")
	if idx < 0 {
		t.Fatalf("missing header/body separator: %q", out)
	}
	header := out[:idx]
	body := out[idx+4:]
	if !strings.HasPrefix(header, "Content-Length: ") {
		t.Fatalf("header missing Content-Length: %q", header)
	}
	declared := strings.TrimPrefix(header, "Content-Length: ")
	if declared != itoa(len(body)) {
		t.Errorf("Content-Length=%s, body bytes=%d", declared, len(body))
	}
	var round Message
	if err := json.Unmarshal([]byte(body), &round); err != nil {
		t.Fatalf("body not valid JSON: %v", err)
	}
	if round.JSONRPC != msg.JSONRPC || round.Method != msg.Method {
		t.Errorf("round-trip mismatch: %+v vs %+v", round, msg)
	}
	if string(round.ID) != string(msg.ID) {
		t.Errorf("ID round-trip mismatch: %q vs %q", round.ID, msg.ID)
	}
}

func TestNewRequest_GeneratesValidMessage(t *testing.T) {
	msg := NewRequest(json.RawMessage("1"), "initialize", map[string]any{"rootUri": "file:///x"})
	if msg.JSONRPC != "2.0" {
		t.Errorf("JSONRPC: got %q, want %q", msg.JSONRPC, "2.0")
	}
	if string(msg.ID) != "1" {
		t.Errorf("ID: got %q, want %q", msg.ID, "1")
	}
	if msg.Method != "initialize" {
		t.Errorf("Method: got %q", msg.Method)
	}
	var params map[string]any
	if err := json.Unmarshal(msg.Params, &params); err != nil {
		t.Fatalf("Params not valid JSON: %v (raw=%s)", err, msg.Params)
	}
	if params["rootUri"] != "file:///x" {
		t.Errorf("Params rootUri: got %v", params["rootUri"])
	}
}

// itoa avoids importing strconv just for tests.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
