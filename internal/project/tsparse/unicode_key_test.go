package tsparse

import "testing"

func TestObjectKeysUseUnicodeCharacters(t *testing.T) {
	for _, key := range []string{"ײ", "שם", "勇者", "é", "Ω", "Ж", "अ", "𐐀", "_key", "$key"} {
		t.Run(key, func(t *testing.T) {
			got, err := ParseExportConst([]byte("export const value = {" + key + ": 1};"))
			if err != nil {
				t.Fatal(err)
			}
			if obj := got.Value.(map[string]Value); obj[key] != float64(1) {
				t.Errorf("key changed: %#v", obj)
			}
		})
	}
	for _, key := range []string{"×", "😀", "1key"} {
		if _, err := ParseExportConst([]byte("export const value = {" + key + ": 1};")); err == nil {
			t.Errorf("invalid bare key accepted: %q", key)
		}
	}
}
