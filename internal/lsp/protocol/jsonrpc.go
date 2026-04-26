package protocol

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// Read parses a single LSP base-protocol framed message from r.
// The frame is `Header\r\n...Header\r\n\r\nBody` where one header must be
// `Content-Length: N`. Body is exactly N bytes of JSON.
func Read(r io.Reader) (*Message, error) {
	br, ok := r.(*bufio.Reader)
	if !ok {
		br = bufio.NewReader(r)
	}
	contentLength := -1
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return nil, fmt.Errorf("read header: %w", err)
		}
		// Strip CRLF.
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			break
		}
		// Why: case-insensitive header name match per LSP base protocol;
		// JSON-RPC bodies are UTF-8 so Content-Type is optional and ignored.
		colon := strings.IndexByte(line, ':')
		if colon < 0 {
			continue
		}
		name := strings.TrimSpace(line[:colon])
		value := strings.TrimSpace(line[colon+1:])
		if strings.EqualFold(name, "Content-Length") {
			n, err := strconv.Atoi(value)
			if err != nil {
				return nil, fmt.Errorf("invalid Content-Length %q: %w", value, err)
			}
			contentLength = n
		}
	}
	if contentLength < 0 {
		return nil, fmt.Errorf("missing Content-Length header")
	}
	body := make([]byte, contentLength)
	if _, err := io.ReadFull(br, body); err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}
	var msg Message
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, fmt.Errorf("decode body: %w", err)
	}
	return &msg, nil
}

// Write encodes msg as a Content-Length framed JSON-RPC message.
func Write(w io.Writer, msg *Message) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}
	if _, err := fmt.Fprintf(w, "Content-Length: %d\r\n\r\n", len(body)); err != nil {
		return fmt.Errorf("write header: %w", err)
	}
	if _, err := w.Write(body); err != nil {
		return fmt.Errorf("write body: %w", err)
	}
	return nil
}

// NewRequest builds a JSON-RPC 2.0 request message. id is passed as RawMessage
// so callers may use either numeric or string IDs.
//
// Why: marshaling user-provided params can theoretically fail (e.g. cyclic
// structures), but in this codebase params come from typed structs we control.
// We surface marshal failure as an empty Params slice so the caller gets a
// well-formed (if param-less) message rather than a panic; tests cover the
// happy path with a map[string]any.
func NewRequest(id json.RawMessage, method string, params any) *Message {
	msg := &Message{JSONRPC: "2.0", ID: id, Method: method}
	if params != nil {
		if raw, err := json.Marshal(params); err == nil {
			msg.Params = raw
		}
	}
	return msg
}

// NewResponse builds a successful JSON-RPC 2.0 response.
func NewResponse(id json.RawMessage, result any) *Message {
	msg := &Message{JSONRPC: "2.0", ID: id}
	if result != nil {
		if raw, err := json.Marshal(result); err == nil {
			msg.Result = raw
		}
	}
	return msg
}

// NewErrorResponse builds a JSON-RPC 2.0 error response.
func NewErrorResponse(id json.RawMessage, code int, message string) *Message {
	return &Message{
		JSONRPC: "2.0",
		ID:      id,
		Error:   &ResponseError{Code: code, Message: message},
	}
}
