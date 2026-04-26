package textlint_test

import (
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/external/textlint"
)

func TestMemoryCache_SetAndGet(t *testing.T) {
	c := textlint.NewMemoryCache(10)
	entry := textlint.CacheEntry{
		Hash:     "abc123",
		Messages: []textlint.Message{{RuleID: "rule1", Severity: textlint.SeverityWarning, Message: "test"}},
		Time:     time.Now(),
	}
	c.Set("key1", entry)
	got, ok := c.Get("key1")
	if !ok {
		t.Fatal("Get returned ok=false, want true")
	}
	if got.Hash != entry.Hash {
		t.Errorf("Hash = %q, want %q", got.Hash, entry.Hash)
	}
	if len(got.Messages) != 1 {
		t.Errorf("len(Messages) = %d, want 1", len(got.Messages))
	}
}

func TestMemoryCache_MissReturnsNotOK(t *testing.T) {
	c := textlint.NewMemoryCache(10)
	_, ok := c.Get("nonexistent")
	if ok {
		t.Error("Get returned ok=true for missing key, want false")
	}
}

func TestMemoryCache_EvictsWhenFull(t *testing.T) {
	// maxEntries=2 — 3rd Set should evict one entry.
	c := textlint.NewMemoryCache(2)
	c.Set("k1", textlint.CacheEntry{Hash: "h1"})
	c.Set("k2", textlint.CacheEntry{Hash: "h2"})
	c.Set("k3", textlint.CacheEntry{Hash: "h3"})

	// After eviction the total stored entries must not exceed maxEntries.
	count := 0
	for _, key := range []string{"k1", "k2", "k3"} {
		if _, ok := c.Get(key); ok {
			count++
		}
	}
	if count > 2 {
		t.Errorf("cache holds %d entries, want <= 2", count)
	}
}

func TestContentHash(t *testing.T) {
	h1 := textlint.ContentHash("/path/a.md", []byte("hello"))
	h2 := textlint.ContentHash("/path/a.md", []byte("hello"))
	h3 := textlint.ContentHash("/path/a.md", []byte("world"))

	if h1 != h2 {
		t.Error("same input produced different hashes")
	}
	if h1 == h3 {
		t.Error("different content produced the same hash")
	}
}
