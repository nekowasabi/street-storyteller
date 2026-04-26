package protocol

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestRead_ParsesContentLengthFrame(t *testing.T) {
	body := `{"jsonrpc":"2.0","id":1,"method":"initialize"}`
	frame := "Content-Length: " + itoa(len(body)) + "\r\n\r\n" + body
	msg, err := Read(strings.NewReader(frame))
	if err != nil {
		t.Fatalf("Read returned error: %v", err)
	}
	if msg.Method != "initialize" {
		t.Errorf("method = %q, want initialize", msg.Method)
	}
	if msg.JSONRPC != "2.0" {
		t.Errorf("jsonrpc = %q, want 2.0", msg.JSONRPC)
	}
}

func TestRead_RejectsMissingHeader(t *testing.T) {
	frame := `{"jsonrpc":"2.0"}`
	if _, err := Read(strings.NewReader(frame)); err == nil {
		t.Fatal("expected error for missing Content-Length, got nil")
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

// itoa is a tiny helper to avoid importing strconv just for tests.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
