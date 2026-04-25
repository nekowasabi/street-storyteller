package transport

// Wire format note: StdioTransport uses "1 line = 1 JSON message"
// (line-delimited JSON, LF-terminated). The LSP-style Content-Length framing
// is intentionally left to a higher layer so this package stays small and
// focused on the bidirectional message channel concern.

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
)

// Message is a single transport-level message. It is a raw JSON value so
// callers can layer their own envelope (JSON-RPC, MCP, etc.) on top.
type Message json.RawMessage

// Transport abstracts a bidirectional stream of JSON messages. Implementations
// must be safe for concurrent use of Send and Receive from different goroutines
// (a single Send and a single Receive at the same time, like real stdio).
//
// Why: LSP and MCP both use stdio JSON-RPC, but real stdio is hard to drive in
// tests. By treating the transport as an interface with both a real (Stdio)
// and an in-process (Fake) implementation we can wire client and server
// directly via channels for unit tests.
type Transport interface {
	Send(ctx context.Context, msg Message) error
	Receive(ctx context.Context) (Message, error)
	Close() error
}

// ErrClosed is returned by Send/Receive after Close has been called.
var ErrClosed = errors.New("transport: closed")

// --- StdioTransport -------------------------------------------------------

// StdioTransport speaks line-delimited JSON over an io.Reader/io.Writer pair,
// typically os.Stdin/os.Stdout. Each Message is sent as one JSON value
// followed by a single '\n'.
type StdioTransport struct {
	// Why: bufio.Reader.ReadBytes is the simplest correct line splitter; raw
	// io.Reader would require us to manage partial reads manually.
	in *bufio.Reader

	writeMu sync.Mutex
	out     io.Writer

	closed atomic.Bool
}

// NewStdioTransport wires a StdioTransport over the given reader and writer.
// The caller retains ownership of in/out; Close on this transport does not
// close the underlying handles (they may be os.Stdin/os.Stdout).
func NewStdioTransport(in io.Reader, out io.Writer) *StdioTransport {
	return &StdioTransport{
		in:  bufio.NewReader(in),
		out: out,
	}
}

// Send serialises msg as a single line on the writer. ctx is honoured before
// the write; the underlying io.Writer is assumed to be either non-blocking or
// quick enough that mid-write cancellation is unnecessary (matches real stdio).
func (s *StdioTransport) Send(ctx context.Context, msg Message) error {
	if s.closed.Load() {
		return ErrClosed
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	// Why: serialise concurrent Sends so one message's bytes cannot be
	// interleaved with another's on the wire.
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	// Why: append the newline in a single Write where possible to reduce the
	// chance of a partial line landing on the wire if the writer is later
	// changed to one without internal buffering guarantees.
	buf := make([]byte, 0, len(msg)+1)
	buf = append(buf, msg...)
	buf = append(buf, '\n')
	if _, err := s.out.Write(buf); err != nil {
		return fmt.Errorf("transport: write: %w", err)
	}
	return nil
}

// Receive reads one line from the reader and returns it (without the trailing
// newline) as a Message. ctx is checked before the read; cancellation during a
// blocking read is not supported here because bufio.Reader has no ctx-aware
// API. Callers that need cancellable receives should close the underlying
// reader to unblock.
func (s *StdioTransport) Receive(ctx context.Context) (Message, error) {
	if s.closed.Load() {
		return nil, ErrClosed
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	line, err := s.in.ReadBytes('\n')
	if err != nil {
		// Why: ReadBytes returns whatever was read so far along with the
		// error. For EOF without trailing newline we still want EOF surfaced
		// so callers can shut down cleanly.
		if errors.Is(err, io.EOF) && len(trimTrailingNewline(line)) == 0 {
			return nil, io.EOF
		}
		if !errors.Is(err, io.EOF) {
			return nil, fmt.Errorf("transport: read: %w", err)
		}
		// EOF with a final unterminated line: treat the line as a message.
	}
	return Message(trimTrailingNewline(line)), nil
}

// Close marks the transport as closed. Subsequent Send/Receive return
// ErrClosed. The underlying reader/writer are intentionally not closed.
func (s *StdioTransport) Close() error {
	s.closed.Store(true)
	return nil
}

func trimTrailingNewline(b []byte) []byte {
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b
}

// --- FakeTransport --------------------------------------------------------

// FakeTransport is an in-process Transport backed by Go channels. Two
// FakeTransports created together via NewFakeTransportPair share crossed
// channels so writing on one is received on the other.
type FakeTransport struct {
	send chan Message // outbound: messages we Send go here.
	recv chan Message // inbound:  messages we Receive read from here.

	// Why: closing the same channel twice panics. closeOnce + closed guard
	// against double-close while still letting the peer observe end-of-stream.
	closeOnce sync.Once
	closed    atomic.Bool
}

// NewFakeTransportPair returns two transports wired so that messages sent on
// one are received on the other. The pair is symmetric: either side can be
// labelled "client" or "server"; the names are for caller readability only.
func NewFakeTransportPair() (client, server *FakeTransport) {
	// Why: buffered with capacity 1 keeps simple Send→Receive flows from
	// deadlocking when both sides are on the same goroutine. Higher
	// concurrency tests still work because Send blocks once the buffer is
	// full, with ctx cancellation as the escape hatch.
	c2s := make(chan Message, 1)
	s2c := make(chan Message, 1)

	client = &FakeTransport{send: c2s, recv: s2c}
	server = &FakeTransport{send: s2c, recv: c2s}
	return client, server
}

// Send delivers msg to the peer's Receive. It respects ctx cancellation and
// returns ErrClosed if Close has been called on this end.
func (f *FakeTransport) Send(ctx context.Context, msg Message) error {
	if f.closed.Load() {
		return ErrClosed
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	case f.send <- msg:
		return nil
	}
}

// Receive blocks until a message arrives, ctx is cancelled, or the peer closes
// its send channel (in which case ErrClosed is returned).
func (f *FakeTransport) Receive(ctx context.Context) (Message, error) {
	if f.closed.Load() {
		return nil, ErrClosed
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case msg, ok := <-f.recv:
		if !ok {
			return nil, ErrClosed
		}
		return msg, nil
	}
}

// Close marks this end as closed and closes the outbound channel so the peer's
// Receive observes the closure. Calling Close more than once is safe.
func (f *FakeTransport) Close() error {
	f.closeOnce.Do(func() {
		f.closed.Store(true)
		close(f.send)
	})
	return nil
}

// Compile-time interface checks.
var (
	_ Transport = (*StdioTransport)(nil)
	_ Transport = (*FakeTransport)(nil)
)
