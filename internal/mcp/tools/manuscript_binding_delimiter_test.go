package tools

import (
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/meta"
)

func TestManuscriptBindingRecognizesExistingFrontmatterDelimiters(t *testing.T) {
	for _, tc := range []struct{ name, content, body string }{
		{"CRLF", "---\r\nstoryteller:\r\n  characters:\r\n    - old\r\n---\r\n# Body\r\n", "# Body\r\n"},
		{"closing at EOF", "---\nstoryteller:\n  characters:\n    - old\n---", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			path := writeManuscript(t, root, "chapter.md", tc.content)
			text, isErr := bindingHandle(t, map[string]any{"manuscript": path, "action": "set", "entityType": "characters", "ids": []string{"hero"}, "validate": false}, root)
			if isErr {
				t.Fatalf("binding failed: %s", text)
			}
			content, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			if strings.Count(string(content), "---") != 2 {
				t.Fatalf("duplicate frontmatter: %s", content)
			}
			doc, err := meta.Parse(content)
			if err != nil {
				t.Fatal(err)
			}
			if doc.Body != tc.body || !reflect.DeepEqual(doc.FrontMatter.Characters, []string{"hero"}) {
				t.Fatalf("binding/body changed incorrectly: %+v; output=%s", doc, content)
			}
		})
	}
}
