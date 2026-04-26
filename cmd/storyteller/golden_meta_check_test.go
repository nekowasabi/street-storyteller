package main

import (
	"strings"
	"testing"

	"github.com/takets/street-storyteller/cmd/storyteller/internal/testfixture"
)

// TestGolden_MetaCheck_CinderellaMinimal exercises `meta check` against the
// deterministic cinderella minimal fixture and compares stdout/exit code with
// the golden file. The TempDir prefix is canonicalized to [TMPDIR] so the
// golden remains stable across runs.
//
// Why: reuse runGolden / assertGolden / updateGolden defined in golden_test.go
// (same package) instead of redefining them, to avoid duplicate -update flag
// registration.
func TestGolden_MetaCheck_CinderellaMinimal(t *testing.T) {
	root := t.TempDir()
	if err := testfixture.CinderellaMinimal(root); err != nil {
		t.Fatalf("materialize fixture: %v", err)
	}

	code, out, _ := runGolden(t, []string{"meta", "check", "--path", root})

	// Canonicalize TempDir path so the golden file stays reproducible.
	canonical := strings.ReplaceAll(out, root, "[TMPDIR]")

	assertGolden(t, "meta_check_cinderella.txt", canonical)

	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
}
