package tools

import (
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/meta"
)

func TestManuscriptBindingCreatesListsInsideStoryteller(t *testing.T) {
	for _, tc := range []struct{ name, content string }{
		{"replace existing", "---\nstoryteller:\n  characters: [old]\n---\n# Chapter\n"},
		{"insert missing", "---\nstoryteller:\n  chapter_id: chapter01\n  settings:\n    - forest\n---\n# Chapter\n"},
		{"parent trailing whitespace", "---\nstoryteller:  \n  chapter_id: chapter01\n---\n# Chapter\n"},
		{"create frontmatter", "# Chapter\n"},
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
			doc, err := meta.Parse(content)
			if err != nil {
				t.Fatalf("official parser rejected tool output: %v; output=%s", err, content)
			}
			if !reflect.DeepEqual(doc.FrontMatter.Characters, []string{"hero"}) {
				t.Fatalf("bound IDs disappeared: %#v; output=%s", doc.FrontMatter.Characters, content)
			}
			if doc.Body != "# Chapter\n" {
				t.Fatalf("body changed: %q", doc.Body)
			}
			if tc.name == "insert missing" && !reflect.DeepEqual(doc.FrontMatter.Settings, []string{"forest"}) {
				t.Fatalf("unrelated settings changed: %#v", doc.FrontMatter.Settings)
			}
		})
	}
}

func TestManuscriptBindingDoesNotChangeAnotherParent(t *testing.T) {
	root := t.TempDir()
	const other = "custom:\n  characters:\n    - outsider\n"
	path := writeManuscript(t, root, "chapter.md", "---\nstoryteller:\n  chapter_id: chapter01\n"+other+"---\n# Chapter\n")
	text, isErr := bindingHandle(t, map[string]any{"manuscript": path, "action": "add", "entityType": "characters", "ids": []string{"hero"}, "validate": false}, root)
	if isErr {
		t.Fatalf("binding failed: %s", text)
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(content), other+"---\n") {
		t.Fatalf("unrelated parent changed: %s", content)
	}
	doc, err := meta.Parse(content)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(doc.FrontMatter.Characters, []string{"hero"}) {
		t.Fatalf("wrong canonical IDs: %#v; output=%s", doc.FrontMatter.Characters, content)
	}
}

func TestManuscriptBindingCanonicalActions(t *testing.T) {
	for _, entity := range []string{"characters", "settings", "foreshadowings", "timeline_events", "phases", "timelines"} {
		for _, tc := range []struct {
			action string
			want   []string
		}{
			{"add", []string{"old", "keep", "new"}},
			{"remove", []string{"keep"}},
			{"set", []string{"old", "new"}},
		} {
			t.Run(entity+"/"+tc.action, func(t *testing.T) {
				prefix := "custom:\n  " + entity + ":\n    - unrelated\n"
				suffix := "other:\n  title: preserved\n"
				input := "---\n" + prefix + "storyteller:\n  " + entity + ":\n    - old\n    - keep\n" + suffix + "---\nBody\n"
				output, err := updateFrontmatter(input, entity, tc.action, []string{"old", "new"})
				if err != nil {
					t.Fatal(err)
				}
				fm, body, ok := meta.SplitFrontmatter(output)
				if !ok || body != "Body\n" || !strings.HasPrefix(fm, prefix) || !strings.HasSuffix(fm, suffix) {
					t.Fatalf("unrelated content changed: %s", output)
				}
				if got := bindingList(fm, entity); !reflect.DeepEqual(got, tc.want) {
					t.Fatalf("got %v, want %v; output=%s", got, tc.want, output)
				}
			})
		}
	}
}
