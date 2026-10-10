package tsparse

import (
	"encoding/json"
	"testing"
	"unicode/utf8"
)

func FuzzParseExportConst(f *testing.F) {
	for _, seed := range []string{
		"export const hero = { name: '勇者', traits: ['brave'] };",
		"import type {\n Character\n} from './types.ts';\nexport const hero: Character = {};",
		"export const hero = { summary: `First\nimport precious goods\nLast` };",
		"export const value = [{ a: { b: [null, true, 12.5] } }];",
		"export const value = { text: '\\uD83D\\uDE00' };",
		"",
	} {
		f.Add([]byte(seed))
	}
	f.Fuzz(func(t *testing.T, source []byte) {
		if len(source) > 64*1024 {
			t.Skip()
		}
		_, _ = ParseExportConst(source)
	})
}

func FuzzParseJSONString(f *testing.F) {
	for _, seed := range []string{"", "勇者😀", "import goods\nfrom the harbor", "\"\\\n\t\x00", "\u2028\u2029"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, value string) {
		if len(value) > 64*1024 || !utf8.ValidString(value) {
			t.Skip()
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		result, err := ParseExportConst([]byte("export const text = " + string(encoded) + ";"))
		if err != nil {
			t.Fatalf("JSON string was rejected: %v", err)
		}
		if result.Value != value {
			t.Fatalf("string changed: got %q, want %q", result.Value, value)
		}
	})
}
