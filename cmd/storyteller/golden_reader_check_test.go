package main

import "testing"

// The relative path keeps finding file names identical on every machine.
func TestGolden_ReaderCheck_Rainkey201JSON(t *testing.T) {
	dir := "../../internal/service/testdata/clarity_rainkey/"
	code, out, _ := runGolden(t, []string{"reader", "check", "--json",
		"--path", dir + "manuscripts", "--observations", dir + "observations_break_201.tsv"})
	assertGolden(t, "reader_check_rainkey_201.json", out)
	if code != 0 {
		t.Errorf("exit = %d, want 0", code)
	}
}
