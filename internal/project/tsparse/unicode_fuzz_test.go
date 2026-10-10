package tsparse

import (
	"fmt"
	"strings"
	"testing"
	"unicode/utf16"
	"unicode/utf8"
)

func FuzzParseUTF16String(f *testing.F) {
	for _, seed := range []string{"", "勇者😀𠮷", "\x00\n\t\\\"", "import precious goods"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, value string) {
		if len(value) > 16*1024 || !utf8.ValidString(value) {
			t.Skip()
		}
		var source strings.Builder
		source.WriteString(`export const text = "`)
		for _, unit := range utf16.Encode([]rune(value)) {
			fmt.Fprintf(&source, `\u%04X`, unit)
		}
		source.WriteString(`";`)
		result, err := ParseExportConst([]byte(source.String()))
		if err != nil {
			t.Fatal(err)
		}
		if result.Value != value {
			t.Fatalf("UTF-16 escaped string changed: got %q, want %q", result.Value, value)
		}
	})
}
