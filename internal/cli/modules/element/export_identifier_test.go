package element

import (
	"github.com/takets/street-storyteller/internal/project/tsparse"
	"path/filepath"
	"strings"
	"testing"
)

func TestElementGeneratedExportIdentifiers(t *testing.T) {
	for _, id := range []string{"hero", "hero_v2", "$hero", "勇者", "hero-v2", "123hero", "class", "default", "await", "😀", "hero name"} {
		t.Run(id, func(t *testing.T) {
			root := t.TempDir()
			ctx, _, stderr := newCtx(t, []string{"--id", id, "--name", "勇者"}, false, root)
			if code := New("character").Handle(ctx); code != 0 {
				t.Fatalf("exit=%d: %s", code, stderr.String())
			}
			parsed, err := tsparse.ParseExportConstFile(filepath.Join(root, "src", "characters", id+".ts"))
			if err != nil {
				t.Fatalf("generated source cannot be parsed: %v", err)
			}
			obj := parsed.Value.(map[string]tsparse.Value)
			if obj["id"] != id || obj["name"] != "勇者" {
				t.Fatalf("entity identity changed: %#v", obj)
			}
			switch id {
			case "hero", "hero_v2", "$hero", "勇者":
				if parsed.Name != id {
					t.Errorf("existing valid export changed: %q", parsed.Name)
				}
			default:
				if parsed.Name == id || !strings.HasPrefix(parsed.Name, "element_") {
					t.Errorf("unsafe export name %q", parsed.Name)
				}
			}
		})
	}
}
