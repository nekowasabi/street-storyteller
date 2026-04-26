package server

import (
	"sync"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// State enumerates the MCP server lifecycle phases.
type State int

const (
	// StateUninitialized is the constructed-but-no-initialize state.
	StateUninitialized State = iota
	// StateInitialized means initialize succeeded; normal requests permitted.
	StateInitialized
	// StateShutdown means shutdown was acknowledged; further requests rejected.
	StateShutdown
)

// Lifecycle tracks the MCP 3-state state machine and is safe for concurrent
// use across the dispatcher loop.
//
// Why: explicit type rather than a bool — MCP requires distinguishing
// "initialize never sent" vs "shutdown received"; both must reject general
// requests but for different reasons that aid debugging.
type Lifecycle struct {
	mu    sync.Mutex
	state State
}

// NewLifecycle constructs a Lifecycle in StateUninitialized.
func NewLifecycle() *Lifecycle { return &Lifecycle{state: StateUninitialized} }

// Initialize transitions Uninitialized → Initialized. Calling twice returns
// a Validation error.
func (l *Lifecycle) Initialize() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.state != StateUninitialized {
		return apperrors.New(apperrors.CodeValidation, "lifecycle: already initialized")
	}
	l.state = StateInitialized
	return nil
}

// Shutdown moves the lifecycle into StateShutdown unconditionally. Idempotent.
func (l *Lifecycle) Shutdown() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.state = StateShutdown
	return nil
}

// RequireInitialized returns a typed Validation error when the server is not
// in StateInitialized. Used by handlers that must refuse pre-init traffic.
func (l *Lifecycle) RequireInitialized() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.state != StateInitialized {
		return apperrors.New(apperrors.CodeValidation, "lifecycle: server not initialized")
	}
	return nil
}

// State returns the current lifecycle state.
func (l *Lifecycle) State() State {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.state
}
