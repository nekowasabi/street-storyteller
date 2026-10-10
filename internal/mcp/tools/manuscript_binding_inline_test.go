package tools

import (
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/meta"
)

func TestBindingUpdatePreservesUnchangedInlineLists(t *testing.T) {
	const input = "---\nstoryteller:\n  characters: [チエ, ビッグママ]\n  settings: [ビッグママの食堂]\n---\nBody\n"
	output, err := updateFrontmatter(input, "characters", "set", []string{"チエ", "ビッグ・マム"})
	if err != nil {
		t.Fatal(err)
	}
	doc, err := meta.Parse([]byte(output))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(doc.FrontMatter.Settings, []string{"ビッグママの食堂"}) {
		t.Fatalf("unchanged inline settings disappeared: %s", output)
	}
	if !reflect.DeepEqual(doc.FrontMatter.Characters, []string{"チエ", "ビッグ・マム"}) || doc.Body != "Body\n" {
		t.Fatalf("binding or body changed incorrectly: %+v", doc)
	}
}
