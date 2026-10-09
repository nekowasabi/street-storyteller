package protocol

import (
	"errors"
	"io"
	"strings"
	"testing"
)

func TestReadDistinguishesCleanEOFFromTruncatedFrames(t *testing.T) {
	for _, tc := range []struct {
		name, input string
		want        error
	}{
		{"clean EOF", "", io.EOF},
		{"partial header", "Content-Length: 2", io.ErrUnexpectedEOF},
		{"missing header separator", "Content-Length: 2\r\n", io.ErrUnexpectedEOF},
		{"unknown header only", "X-Header: value\r\n", io.ErrUnexpectedEOF},
		{"missing body", "Content-Length: 2\r\n\r\n", io.ErrUnexpectedEOF},
		{"partial body", "Content-Length: 2\r\n\r\n{", io.ErrUnexpectedEOF},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Read(strings.NewReader(tc.input))
			if !errors.Is(err, tc.want) {
				t.Fatalf("error = %v, want %v", err, tc.want)
			}
		})
	}
}
