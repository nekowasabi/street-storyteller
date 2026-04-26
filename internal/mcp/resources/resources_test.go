package resources

import "testing"

// Why: process-101 coverage. 純粋関数の smoke test。

func TestList(t *testing.T) {
	rs := List()
	if len(rs) == 0 {
		t.Fatal("List returned empty")
	}
	seen := map[string]bool{}
	for _, r := range rs {
		if r.URI == "" || r.Name == "" {
			t.Errorf("invalid resource: %+v", r)
		}
		if seen[r.URI] {
			t.Errorf("duplicate URI: %q", r.URI)
		}
		seen[r.URI] = true
	}
}

func TestParseURI(t *testing.T) {
	cases := []struct {
		uri    string
		kind   string
		id     string
		expand bool
	}{
		{"storyteller://characters", "characters", "", false},
		{"storyteller://character/hero", "character", "hero", false},
		{"storyteller://character/hero?expand=details", "character", "hero", true},
		{"storyteller://settings?expand=details", "settings", "", true},
		{"", "", "", false},
	}
	for _, tc := range cases {
		t.Run(tc.uri, func(t *testing.T) {
			kind, id, expand := ParseURI(tc.uri)
			if kind != tc.kind || id != tc.id || expand != tc.expand {
				t.Errorf("ParseURI(%q) = (%q, %q, %v) want (%q, %q, %v)",
					tc.uri, kind, id, expand, tc.kind, tc.id, tc.expand)
			}
		})
	}
}
