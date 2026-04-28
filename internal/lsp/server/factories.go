package server

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/domain"
	"github.com/takets/street-storyteller/internal/lsp/diagnostics"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
	"github.com/takets/street-storyteller/internal/lsp/providers"
	"github.com/takets/street-storyteller/internal/project"
	"github.com/takets/street-storyteller/internal/project/store"
	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// NewServerOptions builds the production dependencies for a storyteller LSP
// server rooted at rootURI. Missing or partially loaded projects degrade to an
// empty catalog so the server still starts and returns null/empty provider
// responses instead of failing the editor session.
func NewServerOptions(ctx context.Context, rootURI string) (ServerOptions, error) {
	root, err := pathFromFileURI(rootURI)
	if err != nil {
		return ServerOptions{}, err
	}
	if err := ctx.Err(); err != nil {
		return ServerOptions{}, fmt.Errorf("build lsp server options: %w", err)
	}

	proj, err := project.Load(root)
	if err != nil {
		debugf(os.Stderr, "project load root=%q ok=false err=%v", root, err)
		proj = &project.Project{
			Root:  root,
			Store: store.New(),
		}
	} else {
		debugf(os.Stderr, "project load root=%q ok=true characters=%d settings=%d foreshadowings=%d", root, len(proj.Store.AllCharacters()), len(proj.Store.AllSettings()), len(proj.Store.AllForeshadowings()))
	}
	adapter := newProjectAdapter(proj)
	return ServerOptions{
		Catalog: adapter,
		Lookup:  adapter,
		Locator: adapter,
		Aggregator: &diagnostics.Aggregator{Sources: []diagnostics.DiagnosticSource{
			&diagnostics.StorytellerSource{Catalog: adapter},
		}},
		Clock: clock.RealClock{},
		Debug: os.Stderr,
	}, nil
}

func pathFromFileURI(rootURI string) (string, error) {
	if rootURI == "" {
		wd, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("resolve working directory: %w", err)
		}
		return filepath.Abs(wd)
	}
	u, err := url.Parse(rootURI)
	if err != nil {
		return "", fmt.Errorf("parse root uri %q: %w", rootURI, err)
	}
	if u.Scheme != "file" {
		return "", fmt.Errorf("unsupported root uri scheme %q", u.Scheme)
	}
	return filepath.Abs(u.Path)
}

type projectAdapter struct {
	root  string
	store *store.Store
	files map[detect.EntityRef]string
}

func newProjectAdapter(proj *project.Project) *projectAdapter {
	st := store.New()
	root := ""
	if proj != nil {
		root = proj.Root
		if proj.Store != nil {
			st = proj.Store
		}
	}
	return &projectAdapter{root: root, store: st, files: entityFiles(root)}
}

func entityFiles(root string) map[detect.EntityRef]string {
	out := map[detect.EntityRef]string{}
	if root == "" {
		return out
	}
	walk := func(kind detect.EntityKind, dir string) {
		entries, _ := os.ReadDir(filepath.Join(root, dir))
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".ts") {
				continue
			}
			id := strings.TrimSuffix(e.Name(), ".ts")
			out[detect.EntityRef{Kind: kind, ID: id}] = filepath.Join(root, dir, e.Name())
		}
	}
	walk(detect.EntityCharacter, "src/characters")
	walk(detect.EntitySetting, "src/settings")
	walk(detect.EntityForeshadowing, "src/foreshadowings")
	return out
}

func (a *projectAdapter) FindByID(kind detect.EntityKind, id string) (detect.EntityRef, bool) {
	switch kind {
	case detect.EntityCharacter:
		_, err := a.store.Character(id)
		return detect.EntityRef{Kind: kind, ID: id}, err == nil
	case detect.EntitySetting:
		_, err := a.store.Setting(id)
		return detect.EntityRef{Kind: kind, ID: id}, err == nil
	case detect.EntityForeshadowing:
		_, err := a.store.Foreshadowing(id)
		return detect.EntityRef{Kind: kind, ID: id}, err == nil
	default:
		return detect.EntityRef{}, false
	}
}

func (a *projectAdapter) FindByName(name string) (detect.EntityRef, detect.MatchSource, bool) {
	for _, kind := range []detect.EntityKind{detect.EntityCharacter, detect.EntitySetting, detect.EntityForeshadowing} {
		for _, ref := range a.refs(kind) {
			if source, ok := a.matchSource(ref, name); ok {
				return ref, source, true
			}
		}
	}
	return detect.EntityRef{}, "", false
}

func (a *projectAdapter) ListNames(kind detect.EntityKind) []string {
	var out []string
	for _, ref := range a.refs(kind) {
		out = append(out, a.names(ref)...)
	}
	return out
}

func (a *projectAdapter) DetectionHints(kind detect.EntityKind, id string) (detect.Hints, bool) {
	if kind != detect.EntityCharacter {
		return detect.Hints{}, false
	}
	c, err := a.store.Character(id)
	if err != nil {
		return detect.Hints{}, false
	}
	h := detect.Hints{
		Pronouns:     c.Pronouns,
		DisplayNames: c.DisplayNames,
		Aliases:      c.Aliases,
	}
	if c.DetectionHints != nil {
		h.ExcludePatterns = c.DetectionHints.ExcludePatterns
	}
	return h, true
}

func (a *projectAdapter) Lookup(ref detect.EntityRef) (providers.EntityInfo, bool) {
	switch ref.Kind {
	case detect.EntityCharacter:
		c, err := a.store.Character(ref.ID)
		if err != nil {
			return providers.EntityInfo{}, false
		}
		return providers.EntityInfo{Name: c.Name, Kind: string(ref.Kind), Summary: c.Summary}, true
	case detect.EntitySetting:
		s, err := a.store.Setting(ref.ID)
		if err != nil {
			return providers.EntityInfo{}, false
		}
		return providers.EntityInfo{Name: s.Name, Kind: string(ref.Kind), Summary: s.Summary}, true
	case detect.EntityForeshadowing:
		f, err := a.store.Foreshadowing(ref.ID)
		if err != nil {
			return providers.EntityInfo{}, false
		}
		return providers.EntityInfo{Name: f.Name, Kind: string(ref.Kind), Summary: f.Summary}, true
	default:
		return providers.EntityInfo{}, false
	}
}

func (a *projectAdapter) Locate(ref detect.EntityRef) (protocol.Location, bool) {
	path, ok := a.files[ref]
	if !ok {
		return protocol.Location{}, false
	}
	return protocol.Location{
		URI: "file://" + path,
		Range: protocol.Range{
			Start: protocol.Position{Line: 0, Character: 0},
			End:   protocol.Position{Line: 0, Character: 0},
		},
	}, true
}

func (a *projectAdapter) refs(kind detect.EntityKind) []detect.EntityRef {
	switch kind {
	case detect.EntityCharacter:
		cs := a.store.AllCharacters()
		out := make([]detect.EntityRef, 0, len(cs))
		for _, c := range cs {
			out = append(out, detect.EntityRef{Kind: kind, ID: c.ID})
		}
		return out
	case detect.EntitySetting:
		ss := a.store.AllSettings()
		out := make([]detect.EntityRef, 0, len(ss))
		for _, s := range ss {
			out = append(out, detect.EntityRef{Kind: kind, ID: s.ID})
		}
		return out
	case detect.EntityForeshadowing:
		fs := a.store.AllForeshadowings()
		out := make([]detect.EntityRef, 0, len(fs))
		for _, f := range fs {
			out = append(out, detect.EntityRef{Kind: kind, ID: f.ID})
		}
		return out
	default:
		return nil
	}
}

func (a *projectAdapter) names(ref detect.EntityRef) []string {
	switch ref.Kind {
	case detect.EntityCharacter:
		c, err := a.store.Character(ref.ID)
		if err != nil {
			return nil
		}
		return characterNames(c)
	case detect.EntitySetting:
		s, err := a.store.Setting(ref.ID)
		if err != nil {
			return nil
		}
		return append([]string{s.Name}, s.DisplayNames...)
	case detect.EntityForeshadowing:
		f, err := a.store.Foreshadowing(ref.ID)
		if err != nil {
			return nil
		}
		return append([]string{f.Name}, f.DisplayNames...)
	default:
		return nil
	}
}

func (a *projectAdapter) matchSource(ref detect.EntityRef, name string) (detect.MatchSource, bool) {
	switch ref.Kind {
	case detect.EntityCharacter:
		c, err := a.store.Character(ref.ID)
		if err != nil {
			return "", false
		}
		if name == c.Name {
			return detect.SourceName, true
		}
		if contains(c.DisplayNames, name) {
			return detect.SourceDisplayName, true
		}
		if contains(c.Aliases, name) {
			return detect.SourceAlias, true
		}
		if contains(c.Pronouns, name) {
			return detect.SourcePronoun, true
		}
	case detect.EntitySetting:
		s, err := a.store.Setting(ref.ID)
		if err != nil {
			return "", false
		}
		if name == s.Name {
			return detect.SourceName, true
		}
		if contains(s.DisplayNames, name) {
			return detect.SourceDisplayName, true
		}
	case detect.EntityForeshadowing:
		f, err := a.store.Foreshadowing(ref.ID)
		if err != nil {
			return "", false
		}
		if name == f.Name {
			return detect.SourceName, true
		}
		if contains(f.DisplayNames, name) {
			return detect.SourceDisplayName, true
		}
	}
	return "", false
}

func characterNames(c *domain.Character) []string {
	out := []string{c.Name}
	out = append(out, c.DisplayNames...)
	out = append(out, c.Aliases...)
	out = append(out, c.Pronouns...)
	return out
}

func contains(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}
