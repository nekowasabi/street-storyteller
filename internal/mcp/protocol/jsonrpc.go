package protocol

import (
	"bufio"
	"encoding/json"
	"io"
	"strings"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// Read parses one newline-delimited JSON-RPC message from r, skipping blank
// lines. MCP stdio frames each message as a single line of JSON.
//
// Why: callers reading a stream must pass the same *bufio.Reader every call;
// a fresh reader per call would drop bytes already buffered for later lines.
func Read(r io.Reader) (*Message, error) {
	br, ok := r.(*bufio.Reader)
	if !ok {
		br = bufio.NewReader(r)
	}
	for {
		line, err := br.ReadString('\n')
		if line = strings.TrimSpace(line); line != "" {
			var msg Message
			if uerr := json.Unmarshal([]byte(line), &msg); uerr != nil {
				return nil, apperrors.Wrap(uerr, apperrors.CodeParse, "mcp: unmarshal message")
			}
			return &msg, nil
		}
		if err != nil {
			return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: read message")
		}
	}
}

// Write serializes msg as a newline-delimited JSON-RPC message (MCP stdio).
func Write(w io.Writer, msg *Message) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return apperrors.Wrap(err, apperrors.CodeParse, "mcp: marshal message")
	}
	if _, err := w.Write(append(body, '\n')); err != nil {
		return apperrors.Wrap(err, apperrors.CodeIO, "mcp: write body")
	}
	return nil
}

// NewRequest builds a JSON-RPC 2.0 request Message.
func NewRequest(id any, method string, params any) (*Message, error) {
	idRaw, err := json.Marshal(id)
	if err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: marshal id")
	}
	msg := &Message{JSONRPC: "2.0", ID: idRaw, Method: method}
	if params != nil {
		p, err := json.Marshal(params)
		if err != nil {
			return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: marshal params")
		}
		msg.Params = p
	}
	return msg, nil
}

// NewResponse builds a successful JSON-RPC 2.0 response Message.
func NewResponse(id json.RawMessage, result any) (*Message, error) {
	msg := &Message{JSONRPC: "2.0", ID: id}
	if result != nil {
		r, err := json.Marshal(result)
		if err != nil {
			return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: marshal result")
		}
		msg.Result = r
	}
	return msg, nil
}

// NewErrorResponse builds an error JSON-RPC 2.0 response Message.
func NewErrorResponse(id json.RawMessage, code int, message string) *Message {
	return &Message{JSONRPC: "2.0", ID: id, Error: &ResponseError{Code: code, Message: message}}
}
