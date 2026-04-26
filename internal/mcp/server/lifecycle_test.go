package server

import "testing"

func TestLifecycle_RequireInitialized_BeforeInit_Errors(t *testing.T) {
	l := NewLifecycle()
	if err := l.RequireInitialized(); err == nil {
		t.Fatal("expected error before Initialize")
	}
}

func TestLifecycle_AfterInitialize_AcceptsCalls(t *testing.T) {
	l := NewLifecycle()
	if err := l.Initialize(); err != nil {
		t.Fatalf("Initialize: %v", err)
	}
	if err := l.RequireInitialized(); err != nil {
		t.Fatalf("RequireInitialized after Initialize: %v", err)
	}
	if err := l.Initialize(); err == nil {
		t.Fatal("second Initialize should error")
	}
}
