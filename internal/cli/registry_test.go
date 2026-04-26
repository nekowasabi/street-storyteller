package cli

import (
	"reflect"
	"testing"
)

type fakeCommand struct {
	name string
}

func (f *fakeCommand) Name() string                { return f.name }
func (f *fakeCommand) Description() string         { return "" }
func (f *fakeCommand) Handle(_ CommandContext) int { return 0 }

func TestRegistry_RegisterAndResolveSimple(t *testing.T) {
	r := NewRegistry()
	c := &fakeCommand{name: "version"}
	if err := r.Register("version", c); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got, rem, ok := r.Resolve([]string{"version"})
	if !ok {
		t.Fatal("Resolve: ok=false, want true")
	}
	if got != c {
		t.Errorf("Resolve: got %v, want %v", got, c)
	}
	if len(rem) != 0 {
		t.Errorf("remaining = %v, want []", rem)
	}
}

func TestRegistry_ResolveLongestMatch(t *testing.T) {
	r := NewRegistry()
	parent := &fakeCommand{name: "meta"}
	child := &fakeCommand{name: "meta check"}
	if err := r.Register("meta", parent); err != nil {
		t.Fatalf("Register meta: %v", err)
	}
	if err := r.Register("meta check", child); err != nil {
		t.Fatalf("Register meta check: %v", err)
	}

	got, rem, ok := r.Resolve([]string{"meta", "check", "--path", "x"})
	if !ok {
		t.Fatal("Resolve: ok=false")
	}
	if got != child {
		t.Errorf("expected longest match (meta check), got %v", got)
	}
	if !reflect.DeepEqual(rem, []string{"--path", "x"}) {
		t.Errorf("remaining = %v, want [--path x]", rem)
	}
}

func TestRegistry_DuplicateRegisterReturnsError(t *testing.T) {
	r := NewRegistry()
	if err := r.Register("foo", &fakeCommand{name: "foo"}); err != nil {
		t.Fatalf("first Register: %v", err)
	}
	if err := r.Register("foo", &fakeCommand{name: "foo"}); err == nil {
		t.Fatal("duplicate Register: expected error, got nil")
	}
}

func TestRegistry_ListSorted(t *testing.T) {
	r := NewRegistry()
	_ = r.Register("version", &fakeCommand{name: "version"})
	_ = r.Register("help", &fakeCommand{name: "help"})
	_ = r.Register("meta check", &fakeCommand{name: "meta check"})
	got := r.List()
	want := []string{"help", "meta check", "version"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("List = %v, want %v", got, want)
	}
}

func TestRegistry_ResolveNoMatch(t *testing.T) {
	r := NewRegistry()
	_ = r.Register("foo", &fakeCommand{name: "foo"})
	if _, _, ok := r.Resolve([]string{"bar"}); ok {
		t.Fatal("expected ok=false for unknown command")
	}
}
