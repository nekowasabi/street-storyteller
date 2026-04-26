package server

import "testing"

func TestDocumentStore_OpenAndGet(t *testing.T) {
	s := NewDocumentStore()
	s.Open("file:///a", "hello")
	got, ok := s.Get("file:///a")
	if !ok {
		t.Fatal("expected ok=true")
	}
	if got != "hello" {
		t.Fatalf("got %q, want hello", got)
	}
}

func TestDocumentStore_Update_OverwritesContent(t *testing.T) {
	s := NewDocumentStore()
	s.Open("file:///a", "hello")
	s.Update("file:///a", "world")
	got, ok := s.Get("file:///a")
	if !ok {
		t.Fatal("expected ok=true")
	}
	if got != "world" {
		t.Fatalf("got %q, want world", got)
	}
}

func TestDocumentStore_Close_Removes(t *testing.T) {
	s := NewDocumentStore()
	s.Open("file:///a", "hello")
	s.Close("file:///a")
	got, ok := s.Get("file:///a")
	if ok {
		t.Fatal("expected ok=false")
	}
	if got != "" {
		t.Fatalf("got %q, want empty", got)
	}
}
