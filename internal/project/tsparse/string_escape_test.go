package tsparse

import "testing"

func TestJavaScriptStringEscapes(t *testing.T) {
	for _, quote := range []string{`"`, `'`, "`"} {
		for _, tc := range []struct{ name, source, want string }{
			{"vertical tab", `a\vb`, "a\vb"},
			{"LF continuation", "a\\\nb", "ab"},
			{"CRLF continuation", "a\\\r\nb", "ab"},
			{"CR continuation", "a\\\rb", "ab"},
			{"line separator continuation", "a\\\u2028b", "ab"},
			{"paragraph separator continuation", "a\\\u2029b", "ab"},
			{"Latin identity escape", `\é`, "é"},
			{"Japanese identity escape", `\勇`, "勇"},
			{"astral identity escape", `\😀`, "😀"},
		} {
			t.Run(quote+tc.name, func(t *testing.T) {
				got, err := ParseExportConst([]byte("export const value = " + quote + tc.source + quote + ";"))
				if err != nil {
					t.Fatal(err)
				}
				if got.Value != tc.want {
					t.Errorf("got %q, want %q", got.Value, tc.want)
				}
			})
		}
	}
}
