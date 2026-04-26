package server

import (
	"sync/atomic"

	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// Lifecycle tracks the LSP server state machine:
// 0=uninitialized, 1=initialized, 2=shutdown. Transitions are monotonic
// (shutdown is terminal) and safe for concurrent callers.
type Lifecycle struct {
	state atomic.Int32
}

const (
	stateUninitialized int32 = 0
	stateInitialized   int32 = 1
	stateShutdown      int32 = 2
)

// NewLifecycle returns a Lifecycle in the uninitialized state.
func NewLifecycle() *Lifecycle {
	return &Lifecycle{}
}

// MarkInitialized transitions uninitialized -> initialized.
// Why: CAS over plain Store — once shutdown is reached we must not silently
// resurrect the server by re-initializing it.
func (l *Lifecycle) MarkInitialized() {
	l.state.CompareAndSwap(stateUninitialized, stateInitialized)
}

// MarkShutdown forces the terminal state (idempotent).
func (l *Lifecycle) MarkShutdown() {
	l.state.Store(stateShutdown)
}

// RequireInitialized returns a ServerNotInitialized ResponseError unless the
// server is currently in the initialized state.
func (l *Lifecycle) RequireInitialized() error {
	if l.state.Load() != stateInitialized {
		return &protocol.ResponseError{
			Code:    protocol.CodeServerNotInitialized,
			Message: "server not initialized",
		}
	}
	return nil
}

// IsShutdown reports whether MarkShutdown has been called.
func (l *Lifecycle) IsShutdown() bool {
	return l.state.Load() == stateShutdown
}
