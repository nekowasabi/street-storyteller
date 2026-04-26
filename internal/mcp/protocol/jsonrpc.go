package protocol

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// Read parses one Content-Length framed JSON-RPC message from r.
//
// Why: bufio.Reader instead of io.ReadAll — MCP stdio is a long-lived stream
// of multiple frames. Buffering header parsing while leaving the body bytes
// available for the next call is what bufio is for.
func Read(r io.Reader) (*Message, error) {
	br, ok := r.(*bufio.Reader)
	if !ok {
		br = bufio.NewReader(r)
	}

	contentLength := -1
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: read header")
		}
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			break
		}
		if strings.HasPrefix(strings.ToLower(line), "content-length:") {
			v := strings.TrimSpace(line[len("Content-Length:"):])
			n, err := strconv.Atoi(v)
			if err != nil {
				return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: invalid Content-Length")
			}
			contentLength = n
		}
	}
	if contentLength < 0 {
		return nil, apperrors.New(apperrors.CodeParse, "mcp: missing Content-Length header")
	}

	body := make([]byte, contentLength)
	if _, err := io.ReadFull(br, body); err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: read body")
	}
	var msg Message
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeParse, "mcp: unmarshal body")
	}
	return &msg, nil
}

// Write serializes msg as a Content-Length framed JSON-RPC message.
func Write(w io.Writer, msg *Message) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return apperrors.Wrap(err, apperrors.CodeParse, "mcp: marshal message")
	}
	if _, err := fmt.Fprintf(w, "Content-Length: %d\r\n\r\n", len(body)); err != nil {
		return apperrors.Wrap(err, apperrors.CodeIO, "mcp: write header")
	}
	if _, err := w.Write(body); err != nil {
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
