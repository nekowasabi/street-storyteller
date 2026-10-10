package tools

import (
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/meta"
)

func TestManuscriptBindingHandlesBlankLinesInsideLists(t *testing.T) {
	for _, tc := range []struct {
		action    string
		ids, want []string
	}{
		{"add", []string{"keep", "new"}, []string{"old", "keep", "new"}},
		{"remove", []string{"keep"}, []string{"old"}},
		{"set", []string{"new"}, []string{"new"}},
	} {
		t.Run(tc.action, func(t *testing.T) {
			const input = "---\nstoryteller:\n  characters:\n    - old\n\n    - keep\n\n  settings:\n    - forest\n---\nBody\n"
			output, err := updateFrontmatter(input, "characters", tc.action, tc.ids)
			if err != nil {
				t.Fatal(err)
			}
			doc, err := meta.Parse([]byte(output))
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(doc.FrontMatter.Characters, tc.want) {
				t.Fatalf("got %v, want %v; output=%s", doc.FrontMatter.Characters, tc.want, output)
			}
			if !reflect.DeepEqual(doc.FrontMatter.Settings, []string{"forest"}) || doc.Body != "Body\n" {
				t.Fatalf("unrelated content changed: %s", output)
			}
		})
	}
}
