package textlint

import (
	"crypto/sha256"
	"fmt"
	"sync"
	"time"
)

// CacheEntry holds a cached textlint result for a single file.
type CacheEntry struct {
	Hash     string
	Messages []Message
	Time     time.Time
}

// Cache is the storage interface for textlint results.
//
// Why: interface instead of concrete type — allows future replacement with a
// disk-backed cache without changing call sites.
type Cache interface {
	Get(key string) (CacheEntry, bool)
	Set(key string, e CacheEntry)
}

// MemoryCache is a concurrency-safe in-memory cache backed by sync.Map.
// When the number of stored entries exceeds maxEntries, a single arbitrary
// entry is evicted (simple LRU approximation using sync.Map).
//
// Why: sync.Map is chosen over map+RWMutex because individual key operations
// are the dominant access pattern (no range-heavy workloads), and sync.Map
// avoids lock contention on concurrent per-file requests.
type MemoryCache struct {
	m          sync.Map
	maxEntries int
	// mu protects count only (sync.Map already guards individual keys).
	mu    sync.Mutex
	count int
}

// NewMemoryCache constructs a MemoryCache with the given capacity.
// Passing maxEntries <= 0 defaults to 100.
func NewMemoryCache(maxEntries int) *MemoryCache {
	if maxEntries <= 0 {
		maxEntries = 100
	}
	return &MemoryCache{maxEntries: maxEntries}
}

// Get retrieves the entry for key. Returns (entry, true) on hit, (zero, false) on miss.
func (c *MemoryCache) Get(key string) (CacheEntry, bool) {
	v, ok := c.m.Load(key)
	if !ok {
		return CacheEntry{}, false
	}
	return v.(CacheEntry), true
}

// Set stores entry under key, evicting one arbitrary entry when over capacity.
func (c *MemoryCache) Set(key string, e CacheEntry) {
	c.mu.Lock()
	_, existed := c.m.Load(key)
	if !existed {
		if c.count >= c.maxEntries {
			c.evictOne()
		} else {
			c.count++
		}
	}
	c.mu.Unlock()
	c.m.Store(key, e)
}

// evictOne removes an arbitrary entry from the map. Must be called with mu held.
func (c *MemoryCache) evictOne() {
	c.m.Range(func(k, _ any) bool {
		c.m.Delete(k)
		return false // stop after first
	})
	// count stays the same — we removed one and will add one.
}

// ContentHash returns a deterministic key for (path, content) pairs.
// The SHA-256 of the concatenation ensures different paths with the same
// content produce different keys.
func ContentHash(path string, content []byte) string {
	h := sha256.New()
	h.Write([]byte(path))
	h.Write([]byte{0}) // separator
	h.Write(content)
	return fmt.Sprintf("%x", h.Sum(nil))
}
