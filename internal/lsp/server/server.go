// Package server hosts the LSP server core. server.go wires the
// dispatcher / lifecycle / textsync / providers / diagnostics together and
// drives them with a Read/Write loop over an io.Reader / io.Writer pair
// (typically stdio).
package server

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"
	"sync"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
	"github.com/takets/street-storyteller/internal/lsp/providers"
	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// Server is the LSP server bound to a single (in, out) pair.
//
// Why fields-not-args: the dispatcher closures capture *Server so that
// handler bodies remain trivial; pulling state out into per-call args would
// duplicate plumbing for every method.
type Server struct {
	lifecycle  *Lifecycle
	dispatcher *Dispatcher
	docs       *DocumentStore
	aggregator *diagnostics.Aggregator
	catalog    detect.EntityCatalog
	lookup     providers.EntityLookup
	locator    providers.EntityLocator
	clock      clock.Clock

	writeMu sync.Mutex
	writer  io.Writer
}

// ServerOptions bundles the dependencies injected at construction time.
//
// Why: keeping these external instead of constructed-per-Server lets tests
// substitute fakes (catalog, lookup, locator, aggregator, clock) without
// touching production wiring.
type ServerOptions struct {
	Catalog    detect.EntityCatalog
	Lookup     providers.EntityLookup
	Locator    providers.EntityLocator
	Aggregator *diagnostics.Aggregator
	Clock      clock.Clock
}

// NewServer constructs a Server with the supplied dependencies. Internal
// pieces (lifecycle, dispatcher, docs) are always created fresh.
//
// Why NewServer (not New): the dispatcher package-level constructor already
// owns the unqualified name `New` in this package. Renaming the dispatcher
// constructor would ripple into Cluster B's public surface; renaming the
// server constructor is the smaller blast radius.
func NewServer(opts ServerOptions) *Server {
	return &Server{
		lifecycle:  NewLifecycle(),
		dispatcher: New(),
		docs:       NewDocumentStore(),
		aggregator: opts.Aggregator,
		catalog:    opts.Catalog,
		lookup:     opts.Lookup,
		locator:    opts.Locator,
		clock:      opts.Clock,
	}
}

// RegisterStandardHandlers wires the dispatcher with the LSP method set this
// server supports.
func (s *Server) RegisterStandardHandlers() {
	s.dispatcher.Register("initialize", s.handleInitialize)
	s.dispatcher.Register("initialized", s.handleInitialized)
	s.dispatcher.Register("shutdown", s.handleShutdown)
	s.dispatcher.Register("exit", s.handleExit)
	s.dispatcher.Register("textDocument/didOpen", s.handleDidOpen)
	s.dispatcher.Register("textDocument/didChange", s.handleDidChange)
	s.dispatcher.Register("textDocument/didClose", s.handleDidClose)
	s.dispatcher.Register("textDocument/hover", s.handleHover)
	s.dispatcher.Register("textDocument/definition", s.handleDefinition)
}

// Run reads framed JSON-RPC messages from in and writes responses to out
// until EOF, a fatal read error, or ctx cancellation.
//
// Why bufio.Reader at this layer: protocol.Read accepts any io.Reader but
// internally upgrades to bufio.Reader anyway; pre-wrapping lets us reuse the
// same buffer across messages and avoid per-frame allocation.
func (s *Server) Run(ctx context.Context, in io.Reader, out io.Writer) error {
	s.writer = out
	br := bufio.NewReader(in)
	for {
		if err := ctx.Err(); err != nil {
			return nil
		}
		msg, err := protocol.Read(br)
		if err != nil {
			// Why: protocol.Read wraps io.EOF via fmt.Errorf("%w", ...) so
			// errors.Is unwraps cleanly. A clean EOF on the header boundary
			// means the client closed the stream and Run returns nil. Any
			// other read error (e.g. truncated body, malformed header) is a
			// fatal protocol violation and propagates.
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
		s.handle(ctx, msg)
	}
}

// handle dispatches a single message, deciding based on ID presence whether
// to write a response (request) or stay silent (notification).
func (s *Server) handle(ctx context.Context, msg *protocol.Message) {
	result, err := s.dispatcher.Dispatch(ctx, msg.Method, msg.Params)
	// Notifications (id == nil) get no response, even on error.
	if len(msg.ID) == 0 {
		return
	}
	if err != nil {
		code := protocol.CodeInternalError
		message := err.Error()
		var rerr *protocol.ResponseError
		if errors.As(err, &rerr) {
			code = rerr.Code
			message = rerr.Message
		}
		s.write(protocol.NewErrorResponse(msg.ID, code, message))
		return
	}
	s.write(protocol.NewResponse(msg.ID, result))
}

// write serializes msg under writeMu so concurrent goroutines (e.g. async
// diagnostic publication) can't interleave frames on the wire.
func (s *Server) write(msg *protocol.Message) {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	if s.writer == nil {
		return
	}
	_ = protocol.Write(s.writer, msg)
}

// --- handlers -------------------------------------------------------------

func (s *Server) handleInitialize(_ context.Context, params json.RawMessage) (any, error) {
	var p protocol.InitializeParams
	if len(params) > 0 {
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &protocol.ResponseError{
				Code:    protocol.CodeInvalidParams,
				Message: "initialize: " + err.Error(),
			}
		}
	}
	s.lifecycle.MarkInitialized()
	return protocol.InitializeResult{
		Capabilities: StandardCapabilities(),
		ServerInfo:   StandardServerInfo(),
	}, nil
}

func (s *Server) handleInitialized(_ context.Context, _ json.RawMessage) (any, error) {
	return nil, nil
}

func (s *Server) handleShutdown(_ context.Context, _ json.RawMessage) (any, error) {
	s.lifecycle.MarkShutdown()
	return nil, nil
}

func (s *Server) handleExit(_ context.Context, _ json.RawMessage) (any, error) {
	return nil, nil
}

func (s *Server) handleDidOpen(ctx context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.DidOpenTextDocumentParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeInvalidParams,
			Message: "didOpen: " + err.Error(),
		}
	}
	s.docs.Open(p.TextDocument.URI, p.TextDocument.Text)
	s.publishDiagnostics(ctx, p.TextDocument.URI, p.TextDocument.Text)
	return nil, nil
}

func (s *Server) handleDidChange(ctx context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.DidChangeTextDocumentParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeInvalidParams,
			Message: "didChange: " + err.Error(),
		}
	}
	// Why full-replace: capabilities advertise TextDocumentSync=1 (Full), so
	// the last (or sole) ContentChanges entry is the new full document text.
	if len(p.ContentChanges) > 0 {
		text := p.ContentChanges[len(p.ContentChanges)-1].Text
		s.docs.Update(p.TextDocument.URI, text)
		s.publishDiagnostics(ctx, p.TextDocument.URI, text)
	}
	return nil, nil
}

func (s *Server) handleDidClose(_ context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p struct {
		TextDocument protocol.TextDocumentIdentifier `json:"textDocument"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, nil
	}
	s.docs.Close(p.TextDocument.URI)
	return nil, nil
}

func (s *Server) handleHover(ctx context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.HoverParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeInvalidParams,
			Message: "hover: " + err.Error(),
		}
	}
	content, ok := s.docs.Get(p.TextDocument.URI)
	if !ok {
		return nil, nil
	}
	snap := documentSnapshot{uri: p.TextDocument.URI, content: content}
	return providers.Hover(ctx, snap, p.Position, s.catalog, s.lookup)
}

func (s *Server) handleDefinition(ctx context.Context, params json.RawMessage) (any, error) {
	if err := s.lifecycle.RequireInitialized(); err != nil {
		return nil, err
	}
	var p protocol.DefinitionParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, &protocol.ResponseError{
			Code:    protocol.CodeInvalidParams,
			Message: "definition: " + err.Error(),
		}
	}
	content, ok := s.docs.Get(p.TextDocument.URI)
	if !ok {
		return protocol.DefinitionResult{}, nil
	}
	snap := documentSnapshot{uri: p.TextDocument.URI, content: content}
	return providers.Definition(ctx, snap, p.Position, s.catalog, s.locator)
}

// publishDiagnostics runs the aggregator (if configured) and writes a
// `textDocument/publishDiagnostics` notification (no id).
//
// Why ignore aggregator errors: a single source failing should not stall the
// server; the surfaced effect is "no diagnostics for this revision". The
// caller can re-trigger via didChange.
func (s *Server) publishDiagnostics(ctx context.Context, uri, content string) {
	if s.aggregator == nil {
		return
	}
	diags, err := s.aggregator.Generate(ctx, uri, content)
	if err != nil {
		return
	}
	if diags == nil {
		diags = []protocol.Diagnostic{}
	}
	params := protocol.PublishDiagnosticsParams{URI: uri, Diagnostics: diags}
	raw, err := json.Marshal(params)
	if err != nil {
		return
	}
	// Why: notifications carry no ID. Build the message directly so the
	// `id` field is omitted from the wire frame.
	s.write(&protocol.Message{
		JSONRPC: "2.0",
		Method:  "textDocument/publishDiagnostics",
		Params:  raw,
	})
}

// documentSnapshot adapts a (uri, content) pair to providers.DocumentSnapshot.
type documentSnapshot struct {
	uri     string
	content string
}

func (d documentSnapshot) URI() string     { return d.uri }
func (d documentSnapshot) Content() string { return d.content }
