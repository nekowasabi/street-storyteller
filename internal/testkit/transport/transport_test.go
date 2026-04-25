package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"testing"
	"time"
)

// helperMessage builds a Message from a JSON-marshalable value for tests.
func helperMessage(t *testing.T, v any) Message {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return Message(b)
}

func TestFakeTransportPair_RoundTrip(t *testing.T) {
	t.Parallel()

	client, server := NewFakeTransportPair()
	t.Cleanup(func() {
		_ = client.Close()
		_ = server.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	want := helperMessage(t, map[string]any{"jsonrpc": "2.0", "method": "ping"})
	if err := client.Send(ctx, want); err != nil {
		t.Fatalf("client.Send: %v", err)
	}

	got, err := server.Receive(ctx)
	if err != nil {
		t.Fatalf("server.Receive: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("roundtrip mismatch: got %s want %s", got, want)
	}
}

func TestFakeTransportPair_BidirectionalEcho(t *testing.T) {
	t.Parallel()

	client, server := NewFakeTransportPair()
	t.Cleanup(func() {
		_ = client.Close()
		_ = server.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	req := helperMessage(t, map[string]any{"id": 1, "method": "echo"})
	if err := client.Send(ctx, req); err != nil {
		t.Fatalf("client.Send: %v", err)
	}

	gotReq, err := server.Receive(ctx)
	if err != nil {
		t.Fatalf("server.Receive: %v", err)
	}

	reply := helperMessage(t, map[string]any{"id": 1, "result": gotReq})
	if err := server.Send(ctx, reply); err != nil {
		t.Fatalf("server.Send: %v", err)
	}

	gotReply, err := client.Receive(ctx)
	if err != nil {
		t.Fatalf("client.Receive: %v", err)
	}
	if !bytes.Equal(gotReply, reply) {
		t.Fatalf("echo mismatch: got %s want %s", gotReply, reply)
	}
}

func TestFakeTransport_ContextCancelOnReceive(t *testing.T) {
	t.Parallel()

	client, _ := NewFakeTransportPair()
	t.Cleanup(func() { _ = client.Close() })

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := client.Receive(ctx)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}

func TestFakeTransport_ContextCancelOnSend(t *testing.T) {
	t.Parallel()

	// Why: pre-cancel the context to verify Send respects cancellation even
	// before any actual channel send. Receive-side blocking is exercised in
	// the receive cancel test above.
	client, _ := NewFakeTransportPair()
	t.Cleanup(func() { _ = client.Close() })

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := client.Send(ctx, helperMessage(t, "hi"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}

func TestFakeTransport_AfterCloseReturnsError(t *testing.T) {
	t.Parallel()

	client, server := NewFakeTransportPair()

	if err := client.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if err := client.Send(ctx, helperMessage(t, "x")); err == nil {
		t.Fatalf("expected error sending on closed transport")
	}
	if _, err := client.Receive(ctx); err == nil {
		t.Fatalf("expected error receiving on closed transport")
	}

	// server end should also observe closure when reading the now-closed channel.
	if _, err := server.Receive(ctx); err == nil {
		t.Fatalf("expected error from server receiving after peer close")
	}
	_ = server.Close()
}

func TestStdioTransport_RoundTrip(t *testing.T) {
	t.Parallel()

	// Why: io.Pipe gives blocking, in-process pipes that match real stdio
	// semantics (Read blocks until Write happens) without OS handles.
	c2sR, c2sW := io.Pipe()
	s2cR, s2cW := io.Pipe()

	client := NewStdioTransport(s2cR, c2sW)
	server := NewStdioTransport(c2sR, s2cW)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req := helperMessage(t, map[string]any{"id": 7, "method": "hello"})
	go func() {
		if err := client.Send(ctx, req); err != nil {
			t.Errorf("client.Send: %v", err)
		}
	}()

	got, err := server.Receive(ctx)
	if err != nil {
		t.Fatalf("server.Receive: %v", err)
	}
	if !bytes.Equal(got, req) {
		t.Fatalf("stdio roundtrip mismatch: got %s want %s", got, req)
	}

	reply := helperMessage(t, map[string]any{"id": 7, "result": "ok"})
	go func() {
		if err := server.Send(ctx, reply); err != nil {
			t.Errorf("server.Send: %v", err)
		}
	}()
	gotReply, err := client.Receive(ctx)
	if err != nil {
		t.Fatalf("client.Receive: %v", err)
	}
	if !bytes.Equal(gotReply, reply) {
		t.Fatalf("stdio reply mismatch: got %s want %s", gotReply, reply)
	}

	_ = c2sW.Close()
	_ = s2cW.Close()
}

func TestStdioTransport_LineDelimited(t *testing.T) {
	t.Parallel()

	// Why: protocol contract is "1 line = 1 message"; verify Send appends '\n'
	// and that multiple messages can be parsed in order. We use a buffer for
	// the sender side to inspect the wire format, then feed it to a reader.
	out := &bytes.Buffer{}
	sender := NewStdioTransport(strings.NewReader(""), out)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	msgs := []Message{
		helperMessage(t, "first"),
		helperMessage(t, map[string]any{"k": 2}),
		helperMessage(t, []int{1, 2, 3}),
	}
	for _, m := range msgs {
		if err := sender.Send(ctx, m); err != nil {
			t.Fatalf("Send: %v", err)
		}
	}

	// Confirm the wire actually contains one line per message.
	if got := strings.Count(out.String(), "\n"); got != len(msgs) {
		t.Fatalf("expected %d newlines, got %d in %q", len(msgs), got, out.String())
	}

	// Parse back via a fresh transport reading the buffered wire.
	receiver := NewStdioTransport(bytes.NewReader(out.Bytes()), io.Discard)
	for i, want := range msgs {
		got, err := receiver.Receive(ctx)
		if err != nil {
			t.Fatalf("Receive[%d]: %v", i, err)
		}
		if !bytes.Equal(got, want) {
			t.Fatalf("msg[%d]: got %s want %s", i, got, want)
		}
	}
}

func TestStdioTransport_ReceiveEOF(t *testing.T) {
	t.Parallel()

	in := bytes.NewReader(nil)
	out := &bytes.Buffer{}
	st := NewStdioTransport(in, out)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if _, err := st.Receive(ctx); !errors.Is(err, io.EOF) {
		t.Fatalf("expected io.EOF, got %v", err)
	}
}

func TestFakeTransport_ConcurrentSendReceive(t *testing.T) {
	t.Parallel()

	client, server := NewFakeTransportPair()
	t.Cleanup(func() {
		_ = client.Close()
		_ = server.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	const n = 200
	var wg sync.WaitGroup
	wg.Add(2)

	// Producer on client.
	go func() {
		defer wg.Done()
		for i := 0; i < n; i++ {
			if err := client.Send(ctx, helperMessage(t, i)); err != nil {
				t.Errorf("client.Send[%d]: %v", i, err)
				return
			}
		}
	}()

	// Consumer on server, echoes back.
	go func() {
		defer wg.Done()
		for i := 0; i < n; i++ {
			m, err := server.Receive(ctx)
			if err != nil {
				t.Errorf("server.Receive[%d]: %v", i, err)
				return
			}
			if err := server.Send(ctx, m); err != nil {
				t.Errorf("server.Send[%d]: %v", i, err)
				return
			}
		}
	}()

	// Drain the echoed replies on the client side.
	for i := 0; i < n; i++ {
		if _, err := client.Receive(ctx); err != nil {
			t.Fatalf("client.Receive[%d]: %v", i, err)
		}
	}

	wg.Wait()
}
