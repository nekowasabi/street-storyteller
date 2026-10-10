package protocol

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
)

func TestReadHugeDeclaredLengthDoesNotPanic(t *testing.T) {
	for _, body := range []string{"", `{"jsonrpc":"2.0","method":"initialize"}`} {
		t.Run(fmt.Sprintf("body_bytes_%d", len(body)), func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("short input caused panic: %v", r)
				}
			}()
			maxInt := int(^uint(0) >> 1)
			_, err := Read(strings.NewReader(fmt.Sprintf("Content-Length: %d\r\n\r\n%s", maxInt, body)))
			if !errors.Is(err, io.ErrUnexpectedEOF) {
				t.Fatalf("got %v, want unexpected EOF", err)
			}
		})
	}
}

func TestReadLargeFrameLeavesNextFrameBuffered(t *testing.T) {
	first := `{"jsonrpc":"2.0","method":"large","params":{"text":"` + strings.Repeat("x", 128*1024) + `"}}`
	second := `{"jsonrpc":"2.0","method":"next"}`
	wire := fmt.Sprintf("Content-Length: %d\r\n\r\n%sContent-Length: %d\r\n\r\n%s", len(first), first, len(second), second)
	reader := bufio.NewReader(strings.NewReader(wire))
	for _, want := range []string{"large", "next"} {
		msg, err := Read(reader)
		if err != nil {
			t.Fatal(err)
		}
		if msg.Method != want {
			t.Fatalf("got %q, want %q", msg.Method, want)
		}
	}
}
