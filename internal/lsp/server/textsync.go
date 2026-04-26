package server

import "sync"

// DocumentStore is the in-memory backing for textDocument/didOpen,
// didChange, and didClose notifications. It is safe for concurrent use.
type DocumentStore struct {
	mu   sync.RWMutex
	docs map[string]string
}

// NewDocumentStore returns an empty store.
func NewDocumentStore() *DocumentStore {
	return &DocumentStore{docs: make(map[string]string)}
}

// Open records the initial content for uri (didOpen).
func (s *DocumentStore) Open(uri, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.docs[uri] = content
}

// Update overwrites the content for uri (didChange, full sync).
func (s *DocumentStore) Update(uri, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.docs[uri] = content
}

// Get returns the current content for uri, or ("", false) when absent.
func (s *DocumentStore) Get(uri string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.docs[uri]
	return c, ok
}

// Close removes uri from the store (didClose).
func (s *DocumentStore) Close(uri string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.docs, uri)
}
