// Package project provides the top-level entry point for loading a storyteller
// project from disk: manifest + every entity file referenced by the manifest's
// configured paths.
//
// The package itself is deliberately thin. The heavy lifting lives in:
//   - manifest:  decode `.storyteller.json` into Manifest
//   - tsparse:   parse `export const NAME = {...}` TS object literals
//   - entity:    map parsed object literals into domain entities
//   - store:     index entities by ID / name with duplicate detection
//
// Why a separate top-level package: callers (CLI / LSP / MCP) want a single
// "open the project" call site. Composing the four sub-packages here keeps
// them independent and individually testable while giving applications a
// single ergonomic entry point.
package project

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/entity"
	"github.com/takets/street-storyteller/internal/project/manifest"
	"github.com/takets/street-storyteller/internal/project/store"
)

// Project is a fully-loaded storyteller project: its manifest plus every
// entity file under the manifest-configured paths.
//
// Why expose Manifest and Store as concrete pointers rather than abstract
// interfaces: this is the foundational data type — wrapping it in interfaces
// at this layer would push abstraction onto every consumer prematurely.
// Higher layers (services, MCP tools) can introduce their own facades.
type Project struct {
	// Root is the absolute path to the project root. Always populated on
	// success even when the input was relative.
	Root string

	// Manifest is the parsed `.storyteller.json`. Never nil on success.
	Manifest *manifest.Manifest

	// Store holds every entity loaded from the configured paths.
	// Even if all entity directories are absent, Store is non-nil and empty.
	Store *store.Store
}

// Load reads `<projectRoot>/.storyteller.json` and every entity .ts file under
// the manifest-configured paths, returning a fully populated *Project.
//
// Error contract: every returned error is *apperrors.Error. The Code is one of:
//
//   - CodeNotFound:        manifest file is missing at the given root
//   - CodeManifestInvalid: manifest JSON is malformed or fails schema checks
//   - CodeIO:              filesystem error while listing/reading entity files
//   - CodeParse:           an entity .ts file is not parseable by tsparse
//     (e.g. type annotation, unsupported syntax)
//   - CodeValidation:      a parsed entity has invalid fields (unknown enum,
//     missing required field, wrong type)
//   - CodeEntityConflict:  two entities share an ID within the same kind
//
// Path semantics: an entity directory configured in Manifest.Paths but absent
// on disk is treated as "this kind has no entities" and not as an error.
// This mirrors the TS application's behaviour where a project may legitimately
// omit, say, foreshadowings/ during early authoring.
//
// Why not parallelize per-kind: the load is bounded by ~hundreds of files in
// realistic projects and dominated by parser CPU rather than I/O. A flat
// sequential walk is dramatically simpler and produces deterministic error
// messages that are easier to debug. We can revisit if profiling justifies it.
func Load(projectRoot string) (*Project, error) {
	abs, err := filepath.Abs(projectRoot)
	if err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeIO, "resolve project root").
			WithHints("verify the path is well-formed")
	}

	m, err := manifest.Load(abs)
	if err != nil {
		// Why pass-through: manifest.Load already returns typed *apperrors.Error
		// with appropriate Code (NotFound / IO / ManifestInvalid). Wrapping
		// again would lose the original Code.
		return nil, err
	}

	st := store.New()

	// Why this fixed kind list: ordering is meaningful for deterministic test
	// output and human-readable diagnostics. Characters first because they're
	// referenced by the most other kinds (settings, foreshadowings, etc.).
	walkers := []entityKindWalker{
		{kind: "character", dir: m.Paths.Characters, load: loadCharacterIntoStore(st)},
		{kind: "setting", dir: m.Paths.Settings, load: loadSettingIntoStore(st)},
		{kind: "foreshadowing", dir: m.Paths.Foreshadowings, load: loadForeshadowingIntoStore(st)},
		{kind: "timeline", dir: m.Paths.Timelines, load: loadTimelineIntoStore(st)},
		{kind: "subplot", dir: m.Paths.Subplots, load: loadSubplotIntoStore(st)},
	}
	for _, w := range walkers {
		if err := walkKindDir(abs, w); err != nil {
			return nil, err
		}
	}

	return &Project{
		Root:     abs,
		Manifest: m,
		Store:    st,
	}, nil
}

// entityKindWalker bundles "what to load and where". The loader closure
// captures the destination Store so walkKindDir does not need to know about
// kind-specific entity types.
type entityKindWalker struct {
	kind string
	dir  string
	load func(path string) error
}

// walkKindDir lists files in <root>/<dir>, filters them with isEntityTSFile,
// and invokes the kind-specific loader on each. An absent directory is not
// an error.
//
// Why depth=1 (no recursion): v1 sample projects keep entities flat under
// src/characters/ etc. Adding recursion would require also loading
// CharacterPhase from src/characters/<id>/phases/ which is intentionally
// deferred. Documented in CLAUDE.md / process-02.
func walkKindDir(root string, w entityKindWalker) error {
	dir := filepath.Join(root, w.dir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			// Absent directory: silently skip. This is intentionally not an
			// error so partial projects (e.g. no foreshadowings yet) load.
			return nil
		}
		return apperrors.Wrap(err, apperrors.CodeIO,
			"read "+w.kind+" directory "+dir).
			WithHints("ensure the directory is readable")
	}

	for _, e := range entries {
		if !isEntityTSFile(e) {
			continue
		}
		full := filepath.Join(dir, e.Name())
		if err := w.load(full); err != nil {
			return err
		}
	}
	return nil
}

// isEntityTSFile decides whether a directory entry should be parsed as an
// entity definition. Rules:
//   - must be a regular file (no subdirectories — depth 1 only)
//   - must end in `.ts`
//   - must NOT be `index.ts` (re-export aggregator, not an entity)
//   - must NOT end in `_test.ts` or `.test.ts`
//   - must NOT end in `.d.ts` (type declaration only, no runtime value)
//   - must NOT start with a dot (hidden / OS metadata files)
//
// Why explicit allowlist semantics rather than configurable globs: the rules
// here describe the storyteller convention. Letting users override them
// invites projects that don't load consistently across CLI / LSP / MCP.
func isEntityTSFile(e os.DirEntry) bool {
	if e.IsDir() {
		return false
	}
	name := e.Name()
	if strings.HasPrefix(name, ".") {
		return false
	}
	if !strings.HasSuffix(name, ".ts") {
		return false
	}
	if name == "index.ts" {
		return false
	}
	if strings.HasSuffix(name, ".d.ts") {
		return false
	}
	if strings.HasSuffix(name, "_test.ts") || strings.HasSuffix(name, ".test.ts") {
		return false
	}
	return true
}

// loadCharacterIntoStore returns a per-file loader closure that opens the
// file, parses it via entity.LoadCharacter, and registers the result.
//
// Why closure factories instead of methods: the walker needs a uniform
// `func(path string) error` shape across six kinds. Adapting via closures
// keeps walkKindDir entirely kind-agnostic.
func loadCharacterIntoStore(st *store.Store) func(string) error {
	return func(path string) error {
		f, err := os.Open(path)
		if err != nil {
			return apperrors.Wrap(err, apperrors.CodeIO, "open "+path)
		}
		defer f.Close()
		c, err := entity.LoadCharacter(f)
		if err != nil {
			return err
		}
		return st.AddCharacter(c)
	}
}

func loadSettingIntoStore(st *store.Store) func(string) error {
	return func(path string) error {
		f, err := os.Open(path)
		if err != nil {
			return apperrors.Wrap(err, apperrors.CodeIO, "open "+path)
		}
		defer f.Close()
		s, err := entity.LoadSetting(f)
		if err != nil {
			return err
		}
		return st.AddSetting(s)
	}
}

func loadForeshadowingIntoStore(st *store.Store) func(string) error {
	return func(path string) error {
		f, err := os.Open(path)
		if err != nil {
			return apperrors.Wrap(err, apperrors.CodeIO, "open "+path)
		}
		defer f.Close()
		fr, err := entity.LoadForeshadowing(f)
		if err != nil {
			return err
		}
		return st.AddForeshadowing(fr)
	}
}

func loadTimelineIntoStore(st *store.Store) func(string) error {
	return func(path string) error {
		f, err := os.Open(path)
		if err != nil {
			return apperrors.Wrap(err, apperrors.CodeIO, "open "+path)
		}
		defer f.Close()
		t, err := entity.LoadTimeline(f)
		if err != nil {
			return err
		}
		return st.AddTimeline(t)
	}
}

func loadSubplotIntoStore(st *store.Store) func(string) error {
	return func(path string) error {
		f, err := os.Open(path)
		if err != nil {
			return apperrors.Wrap(err, apperrors.CodeIO, "open "+path)
		}
		defer f.Close()
		sp, err := entity.LoadSubplot(f)
		if err != nil {
			return err
		}
		return st.AddSubplot(sp)
	}
}

// Compile-time assertion that the loader closures we define above match the
// per-kind Add* signatures. Catches future drift in store API without
// requiring a runtime test.
var (
	_ = (*store.Store)(nil).AddCharacter
	_ = (*store.Store)(nil).AddSetting
	_ = (*store.Store)(nil).AddForeshadowing
	_ = (*store.Store)(nil).AddTimeline
	_ = (*store.Store)(nil).AddSubplot
	_ = domain.Character{} // ensure domain import remains required
)
