package prompts

import "testing"

// Why: process-101 coverage. 静的リスト返却の smoke test。

func TestList(t *testing.T) {
	ps := List()
	if len(ps) == 0 {
		t.Fatal("List returned empty")
	}
	seen := map[string]bool{}
	for _, p := range ps {
		if p.Name == "" || p.Description == "" {
			t.Errorf("invalid prompt: %+v", p)
		}
		if seen[p.Name] {
			t.Errorf("duplicate name: %q", p.Name)
		}
		seen[p.Name] = true
	}
}
