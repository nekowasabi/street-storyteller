// Package testfixture provides minimal in-memory project fixtures
// for golden tests that exercise cmd/storyteller end-to-end.
package testfixture

import (
	"fmt"
	"os"
	"path/filepath"
)

const storytellerJSON = `{"version":"1.0.0"}
`

const cinderellaTS = `import type { Character } from "@storyteller/types/v2/character.ts";

export const cinderella: Character = {
  name: "Cinderella",
  role: "protagonist",
  traits: ["kind"],
  relationships: {},
  appearingChapters: ["chapter01"],
  summary: "The kind protagonist.",
};
`

const castleTS = `import type { Setting } from "@storyteller/types/v2/setting.ts";

export const castle: Setting = {
  name: "Royal Castle",
  type: "location",
  summary: "The grand royal castle.",
};
`

const chapter01MD = `---
characters: []
settings: []
---

# Chapter 1

Cinderella entered the castle.
`

// CinderellaMinimal materializes a deterministic, minimal cinderella-like
// storyteller project under root. Returned project layout MUST be stable
// across runs (no time-based names, no random ids) so golden output stays
// reproducible.
//
// Layout produced:
//
//	<root>/
//	  .storyteller.json                        // {"version": "1.0.0"}
//	  src/characters/cinderella.ts             // minimal Character export
//	  src/settings/castle.ts                   // minimal Setting export
//	  manuscripts/chapter01.md                 // FrontMatter + 1 paragraph
//
// The .ts files are intentionally minimal (no details, no displayNames,
// no detectionHints) so they pass through internal/project/tsparse limits.
func CinderellaMinimal(root string) error {
	files := []struct {
		path    string
		content string
	}{
		{".storyteller.json", storytellerJSON},
		{"src/characters/cinderella.ts", cinderellaTS},
		{"src/settings/castle.ts", castleTS},
		{"manuscripts/chapter01.md", chapter01MD},
	}

	for _, f := range files {
		fullPath := filepath.Join(root, f.path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
			return fmt.Errorf("testfixture: %w", err)
		}
		if err := os.WriteFile(fullPath, []byte(f.content), 0o644); err != nil {
			return fmt.Errorf("testfixture: %w", err)
		}
	}

	return nil
}
