package tsparse

import (
	"testing"
)

func TestUnicodeSurrogatePairs(t *testing.T) {
	for _, quote := range []string{"\"", "'", "`"} {
		t.Run(quote, func(t *testing.T) {
			result, err := ParseExportConst([]byte("export const value = " + quote + `A\uD83D\uDE00\uD842\uDFB7Z` + quote + ";"))
			if err != nil {
				t.Fatal(err)
			}
			if result.Value != "A😀𠮷Z" {
				t.Fatalf("escaped story text changed: got %q, want %q", result.Value, "A😀𠮷Z")
			}
		})
	}
}

func TestUnicodeSurrogatesDoNotConsumeFollowingText(t *testing.T) {
	for _, tc := range []struct{ source, want string }{
		{`\uD83DA`, "�A"},
		{`\uD83D\u0041`, "�A"},
		{`\uDE00`, "�"},
		{`\uD83D\uD83D\uDE00`, "�😀"},
		{`\u0041\u65E5`, "A日"},
	} {
		t.Run(tc.source, func(t *testing.T) {
			result, err := ParseExportConst([]byte(`export const text = "` + tc.source + `";`))
			if err != nil {
				t.Fatal(err)
			}
			if result.Value != tc.want {
				t.Fatalf("got %q, want %q", result.Value, tc.want)
			}
		})
	}
}
