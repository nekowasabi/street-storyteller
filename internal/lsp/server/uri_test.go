package server

import (
	"context"
	"net/url"
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

func TestDefinitionURIPreservesReservedPathCharacters(t *testing.T) {
	for _, name := range []string{"my story", "story#draft", "story?draft", "story%20draft", "物語"} {
		t.Run(name, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), name)
			writeHeroProject(t, root)
			rootURI := (&url.URL{Scheme: "file", Path: root}).String()
			opts, err := NewServerOptions(context.Background(), rootURI)
			if err != nil {
				t.Fatal(err)
			}
			location, ok := opts.Locator.Locate(detect.EntityRef{Kind: detect.EntityCharacter, ID: "hero"})
			if !ok {
				t.Fatal("missing hero definition")
			}
			decoded, err := url.Parse(location.URI)
			if err != nil {
				t.Fatal(err)
			}
			want := filepath.Join(root, "src", "characters", "hero.ts")
			if decoded.Path != want || decoded.Fragment != "" || decoded.RawQuery != "" {
				t.Fatalf("definition URI points to the wrong file: got %q (path=%q query=%q fragment=%q), want %q", location.URI, decoded.Path, decoded.RawQuery, decoded.Fragment, want)
			}
		})
	}
}
