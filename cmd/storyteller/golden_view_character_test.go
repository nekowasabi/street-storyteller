package main

import (
	"strings"
	"testing"

	"github.com/takets/street-storyteller/cmd/storyteller/internal/testfixture"
)

// TestGolden_ViewCharacter_Cinderella exercises `view character --id cinderella`
// against the deterministic cinderella minimal fixture and golden-compares the
// canonicalized stdout. Red phase: the golden file may be empty/TBD; run with
// `-update` to regenerate once the command produces the intended output.
//
// Why: reuse existing runGolden / *updateGolden helpers from golden_test.go
// (same package) instead of defining parallel runViewGolden helpers — keeps a
// single source of truth for runMain wiring and -update flag semantics.
func TestGolden_ViewCharacter_Cinderella(t *testing.T) {
	root := t.TempDir()
	if err := testfixture.CinderellaMinimal(root); err != nil {
		t.Fatalf("materialize fixture: %v", err)
	}

	args := []string{"view", "character", "--id", "cinderella", "--path", root}
	code, stdout, _ := runGolden(t, args)

	// Canonicalize TempDir path so golden output stays stable across runs.
	canonical := strings.ReplaceAll(stdout, root, "[TMPDIR]")

	assertGolden(t, "view_character_cinderella.txt", canonical)

	// Why: Instead of expecting exit 0, pin exit 1 as the current contract.
	// The Go implementation does not yet have a TS character loader, so
	// `view character --id cinderella` returns "character not found" (exit 1)
	// with empty stdout. When the Refactor phase lands a working TS loader,
	// flip this expectation to `code != 0` and regenerate the golden file.
	if code != 1 {
		t.Errorf("expected exit 1 (TS loader not yet implemented), got %d", code)
	}
}
