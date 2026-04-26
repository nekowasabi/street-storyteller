package modules_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
	"github.com/takets/street-storyteller/internal/cli/modules"
)

func TestRegisterCoreIncludesProcess04Commands(t *testing.T) {
	r := cli.NewRegistry()
	if err := modules.RegisterCore(r); err != nil {
		t.Fatalf("RegisterCore: %v", err)
	}

	for _, path := range []string{
		"generate",
		"element character",
		"element setting",
		"element timeline",
		"element foreshadowing",
		"element subplot",
		"element beat",
		"element event",
		"element intersection",
		"element phase",
		"update",
		"view list",
		"view setting",
		"view timeline",
		"view foreshadowing",
		"view subplot",
	} {
		if _, _, ok := r.Resolve([]string{path}); !ok {
			t.Errorf("command %q is not registered", path)
		}
	}
}
