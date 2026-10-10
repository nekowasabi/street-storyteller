package tools

import (
	"github.com/takets/street-storyteller/internal/meta"
	"reflect"
	"testing"
)

func TestManuscriptBindingPreservesScalarIDs(t *testing.T) {
	const body = "# Authored body\nExact prose.\n"
	for _, id := range []string{"hero", "勇者😀", " leading ", `"quoted"`, "hero's name", "first\n---\nsecond", "tab\tvalue", "colon: value", "hash # value", ""} {
		t.Run(id, func(t *testing.T) {
			content := "---\nstoryteller:\n  characters:\n    - old\n---\n" + body
			got, err := updateFrontmatter(content, "characters", "set", []string{id})
			if err != nil {
				t.Fatal(err)
			}
			fm, gotBody, _ := meta.SplitFrontmatter(got)
			if gotBody != body {
				t.Errorf("body changed to %q", gotBody)
			}
			if ids := meta.ParseList(fm, "characters"); !reflect.DeepEqual(ids, []string{id}) {
				t.Errorf("ID changed: got %#v, want %#v; document=%q", ids, []string{id}, got)
			}
			removed, err := updateFrontmatter(got, "characters", "remove", []string{id})
			if err != nil {
				t.Fatal(err)
			}
			fm, _, _ = meta.SplitFrontmatter(removed)
			if ids := meta.ParseList(fm, "characters"); len(ids) != 0 {
				t.Errorf("remove left IDs: %#v", ids)
			}
		})
	}
}

func FuzzManuscriptBindingScalarIDs(f *testing.F) {
	for _, id := range []string{"hero", "勇者😀", " leading ", `"quoted"`, "first\n---\nsecond", "", "\x00\xff"} {
		f.Add(id)
	}
	f.Fuzz(func(t *testing.T, id string) {
		if len(id) > 4096 {
			t.Skip()
		}
		const body = "# Authored manuscript\n"
		got, err := updateFrontmatter("---\nstoryteller:\n  characters: []\n---\n"+body, "characters", "set", []string{id})
		if err != nil {
			t.Fatal(err)
		}
		fm, gotBody, _ := meta.SplitFrontmatter(got)
		if gotBody != body {
			t.Fatalf("body changed: %q", gotBody)
		}
		if ids := meta.ParseList(fm, "characters"); !reflect.DeepEqual(ids, []string{id}) {
			t.Fatalf("got %#v, want %#v", ids, []string{id})
		}
	})
}
