package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// R10 at the binary's entry point: help lists review, and --json keeps stdout
// to one JSON object even on a usage error.

func TestGolden_Review_HelpListsReviewCommands(t *testing.T) {
	code, out, _ := runGolden(t, []string{"help"})
	if code != 0 {
		t.Fatalf("exit = %d", code)
	}
	for _, want := range []string{"review clarity", "review typo", "review interest", "review consult", "review turn", "review resolve"} {
		if !strings.Contains(out, want) {
			t.Errorf("help lacks %q", want)
		}
	}
}

func TestGolden_Review_UnknownFlagIsSingleJSONExit2(t *testing.T) {
	code, out, _ := runGolden(t, []string{"--json", "review", "clarity", "--path", "../../internal/service/review/testdata/rainkey/manuscripts", "--observations", "x.tsv"})
	if code != 2 {
		t.Errorf("exit = %d, want 2", code)
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) != 1 {
		t.Fatalf("stdout lines = %d, want 1:\n%s", len(lines), out)
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &m); err != nil || m["verdict"] != "usage" {
		t.Errorf("stdout = %q (%v)", out, err)
	}
}
