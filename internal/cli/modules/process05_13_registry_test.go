package modules_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/cli/modules"
)

func TestRegisterCoreIncludesProcess05To13Commands(t *testing.T) {
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		t.Fatalf("RegisterCore: %v", err)
	}
	for _, path := range []string{
		"lsp start",
		"lsp install",
		"mcp init",
		"mcp start",
		"lint",
		"lint install-hooks",
	} {
		if _, _, ok := r.Resolve([]string{path}); !ok {
			t.Errorf("command %q is not registered", path)
		}
	}
	for _, path := range []string{"rag export", "rag update", "rag install-hooks"} {
		if _, _, ok := r.Resolve([]string{path}); ok {
			t.Errorf("retired command %q must not be registered", path)
		}
	}
}
