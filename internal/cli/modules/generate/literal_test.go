package generate

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/project/tsparse"
)

func TestProjectScaffoldPreservesStringLiterals(t *testing.T) {
	for _, value := range []string{"ordinary", "bell\aend", "vertical\vend", "format\U0001d173end", "勇者😀", "quote\" and \\ slash", "line\nbreak", "<tag> & text"} {
		t.Run(value, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "project")
			if err := createProject(root, value, value); err != nil {
				t.Fatal(err)
			}
			raw, err := os.ReadFile(filepath.Join(root, ".storyteller.json"))
			if err != nil {
				t.Fatal(err)
			}
			var manifest struct {
				Project struct {
					Name string `json:"name"`
				} `json:"project"`
			}
			if err := json.Unmarshal(raw, &manifest); err != nil {
				t.Fatalf("invalid manifest JSON: %v", err)
			}
			if manifest.Project.Name != value {
				t.Fatalf("name changed: %q", manifest.Project.Name)
			}
			config, err := os.ReadFile(filepath.Join(root, "story.config.ts"))
			if err != nil {
				t.Fatal(err)
			}
			// The restricted source parser accepts export const rather than export default.
			config = []byte(strings.Replace(string(config), "export default", "export const config =", 1))
			parsed, err := tsparse.ParseExportConst(config)
			if err != nil {
				t.Fatal(err)
			}
			object := parsed.Value.(map[string]tsparse.Value)
			if object["name"] != value || object["template"] != value {
				t.Fatalf("config values changed: %#v", object)
			}
		})
	}
}
