package server

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/mcp/protocol"
	"github.com/takets/street-storyteller/internal/mcp/tools"
)

// ServerOptions configures a Server instance.
type ServerOptions struct {
	ProjectRoot string
	Name        string
	Version     string
}

// Server orchestrates lifecycle, dispatching, and tool registry over a
// single MCP stdio session.
type Server struct {
	lifecycle  *Lifecycle
	dispatcher *Dispatcher
	registry   tools.Registry
	opts       ServerOptions
}

// New constructs a Server with empty registries; the caller wires tools via
// Tools() and method handlers via RegisterStandardHandlers.
func New(opts ServerOptions) *Server {
	return &Server{
		lifecycle:  NewLifecycle(),
		dispatcher: NewDispatcher(),
		registry:   tools.NewRegistry(),
		opts:       opts,
	}
}

// Tools exposes the underlying registry so callers can install tools.
func (s *Server) Tools() tools.Registry { return s.registry }

// RegisterStandardHandlers installs the canonical MCP method handlers
// (initialize, tools/list, tools/call, resources/list, resources/read,
// prompts/list).
//
// Why all six even when resources/prompts are empty: returning empty arrays
// is what MCP clients expect — omitting the methods makes them respond with
// CodeMethodNotFound which is harder for clients to differentiate from a
// transport bug.
func (s *Server) RegisterStandardHandlers() {
	s.dispatcher.Register("initialize", func(_ context.Context, _ json.RawMessage) (any, error) {
		if err := s.lifecycle.Initialize(); err != nil {
			return nil, err
		}
		return protocol.InitializeResult{
			ProtocolVersion: "2024-11-05",
			Capabilities: protocol.ServerCapabilities{
				Tools:     &protocol.ToolsCapability{},
				Resources: &protocol.ResourcesCapability{},
				Prompts:   &protocol.PromptsCapability{},
			},
			ServerInfo: protocol.ServerInfo{Name: s.opts.Name, Version: s.opts.Version},
		}, nil
	})

	s.dispatcher.Register("tools/list", func(_ context.Context, _ json.RawMessage) (any, error) {
		return protocol.ListToolsResult{Tools: s.registry.List()}, nil
	})

	s.dispatcher.Register("tools/call", func(ctx context.Context, params json.RawMessage) (any, error) {
		var p protocol.CallToolParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, apperrors.Wrap(err, apperrors.CodeParse, "tools/call: parse params")
		}
		t, ok := s.registry.Get(p.Name)
		if !ok {
			return nil, apperrors.New(apperrors.CodeNotFound, "tool not found: "+p.Name)
		}
		return t.Handle(ctx, p.Arguments, tools.ExecutionContext{ProjectRoot: s.opts.ProjectRoot})
	})

	s.dispatcher.Register("resources/list", func(_ context.Context, _ json.RawMessage) (any, error) {
		return protocol.ListResourcesResult{Resources: []protocol.Resource{}}, nil
	})
	s.dispatcher.Register("resources/read", func(_ context.Context, _ json.RawMessage) (any, error) {
		return protocol.ReadResourceResult{Contents: []protocol.ResourceContent{}}, nil
	})
	s.dispatcher.Register("prompts/list", func(_ context.Context, _ json.RawMessage) (any, error) {
		return protocol.ListPromptsResult{Prompts: []protocol.Prompt{}}, nil
	})
}

// Run reads newline-delimited JSON-RPC messages from in and writes responses
// to out until in returns EOF or ctx is cancelled. On cancel Run closes in
// when it is an io.Closer, so the pending read ends instead of outliving Run.
func (s *Server) Run(ctx context.Context, in io.Reader, out io.Writer) error {
	type readResult struct {
		msg *protocol.Message
		err error
	}
	reads := make(chan readResult)
	go func() {
		// Why: one shared reader; a fresh bufio.Reader per message drops buffered bytes.
		br := bufio.NewReader(in)
		for {
			msg, err := protocol.Read(br)
			select {
			case reads <- readResult{msg, err}:
			case <-ctx.Done():
				return
			}
			if err != nil {
				return
			}
		}
	}()
	for {
		var r readResult
		select {
		case <-ctx.Done():
			if c, ok := in.(io.Closer); ok {
				_ = c.Close()
			}
			return ctx.Err()
		case r = <-reads:
		}
		msg, err := r.msg, r.err
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			// Why: unwrap and check for EOF wrapped inside our typed error.
			var ae *apperrors.Error
			if errors.As(err, &ae) && errors.Is(ae.Cause, io.EOF) {
				return nil
			}
			return err
		}
		resp, derr := s.dispatcher.Dispatch(ctx, msg)
		if derr != nil {
			return derr
		}
		if resp == nil {
			continue
		}
		if err := protocol.Write(out, resp); err != nil {
			return err
		}
	}
}
