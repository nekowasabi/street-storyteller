package store

import (
	"sync"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// Kind enumerates the entity classes the Store understands. Kept as a string
// alias so that values are stable across CLI / LSP / MCP boundaries and
// human-readable in logs.
//
// Why: typed string instead of int iota — mirrors the `internal/errors.Code`
// convention, avoids accidental ordering breakage when new kinds appear.
type Kind string

const (
	KindCharacter      Kind = "character"
	KindSetting        Kind = "setting"
	KindForeshadowing  Kind = "foreshadowing"
	KindTimeline       Kind = "timeline"
	KindPlot           Kind = "plot"
	KindCharacterPhase Kind = "character_phase"
)

// kindIndex bundles the three structures we maintain per entity kind:
//   - byID:   map[string]*T for O(1) lookup and duplicate detection
//   - order:  []*T capturing insertion order for stable iteration
//   - byName: map[string][]*T mapping any of {Name, DisplayNames, Aliases}
//     onto the entities advertising that label
//
// Why: separate maps + a slice instead of a single ordered map — Go has no
// ordered map and rolling our own would add complexity for a structure that
// is currently single-goroutine. The slice is the cheap source of truth for
// AllX(); the maps exist purely as accelerators.
type kindIndex[T any] struct {
	byID   map[string]*T
	order  []*T
	byName map[string][]*T
}

func newKindIndex[T any]() kindIndex[T] {
	return kindIndex[T]{
		byID:   make(map[string]*T),
		byName: make(map[string][]*T),
	}
}

// Store is an in-memory index of all entity kinds. A zero Store is *not*
// usable; always construct via New().
//
// Why: sync.RWMutex even though current call sites are single-goroutine — the
// LSP transport will eventually issue concurrent reads while a background
// loader writes. Adding the lock now avoids a future API break and the cost
// is negligible for the expected workload.
type Store struct {
	mu sync.RWMutex

	characters kindIndex[domain.Character]
	settings   kindIndex[domain.Setting]
	fores      kindIndex[domain.Foreshadowing]
	timelines  kindIndex[domain.Timeline]
	plots      kindIndex[domain.Plot]
	phases     kindIndex[domain.CharacterPhase]
}

// New constructs a ready-to-use Store with empty indices.
func New() *Store {
	return &Store{
		characters: newKindIndex[domain.Character](),
		settings:   newKindIndex[domain.Setting](),
		fores:      newKindIndex[domain.Foreshadowing](),
		timelines:  newKindIndex[domain.Timeline](),
		plots:      newKindIndex[domain.Plot](),
		phases:     newKindIndex[domain.CharacterPhase](),
	}
}

// addEntity is the shared insertion routine. It enforces:
//   - non-nil pointer (Validation)
//   - non-empty ID (Validation)
//   - unique ID per kind (EntityConflict)
//
// names is the set of labels (primary name + display names + aliases) that
// the caller wants registered into the name index.
//
// Why: generic helper instead of six near-identical bodies — each Add* still
// owns the kind-specific name extraction (Setting has no Aliases, etc.) but
// the boilerplate around mutex / dedup / order tracking lives once.
func addEntity[T any](idx *kindIndex[T], ptr *T, id string, names []string) error {
	if ptr == nil {
		return apperrors.New(apperrors.CodeValidation, "store: nil entity")
	}
	if id == "" {
		return apperrors.New(apperrors.CodeValidation, "store: empty entity id")
	}
	if _, dup := idx.byID[id]; dup {
		return apperrors.New(apperrors.CodeEntityConflict, "store: duplicate id "+id)
	}
	idx.byID[id] = ptr
	idx.order = append(idx.order, ptr)
	for _, n := range names {
		if n == "" {
			continue
		}
		idx.byName[n] = append(idx.byName[n], ptr)
	}
	return nil
}

// getByID looks up a pointer by id and returns NotFound when absent.
func getByID[T any](idx *kindIndex[T], kind Kind, id string) (*T, error) {
	if v, ok := idx.byID[id]; ok {
		return v, nil
	}
	return nil, apperrors.New(apperrors.CodeNotFound, "store: "+string(kind)+" not found: "+id)
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

// AddCharacter registers c. Indexes Name, DisplayNames and Aliases for FindByName.
func (s *Store) AddCharacter(c *domain.Character) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if c != nil {
		names = append(names, c.Name)
		names = append(names, c.DisplayNames...)
		names = append(names, c.Aliases...)
	}
	id := ""
	if c != nil {
		id = c.ID
	}
	return addEntity(&s.characters, c, id, names)
}

// Character returns the entity registered under id, or NotFound.
func (s *Store) Character(id string) (*domain.Character, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.characters, KindCharacter, id)
}

// AllCharacters returns characters in insertion order. The returned slice is
// a defensive copy so callers can iterate without holding the lock.
func (s *Store) AllCharacters() []*domain.Character {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Character, len(s.characters.order))
	copy(out, s.characters.order)
	return out
}

// ---------------------------------------------------------------------------
// Setting
// ---------------------------------------------------------------------------

// AddSetting registers v. Setting has no Aliases field, only DisplayNames.
func (s *Store) AddSetting(v *domain.Setting) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if v != nil {
		names = append(names, v.Name)
		names = append(names, v.DisplayNames...)
	}
	id := ""
	if v != nil {
		id = v.ID
	}
	return addEntity(&s.settings, v, id, names)
}

func (s *Store) Setting(id string) (*domain.Setting, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.settings, KindSetting, id)
}

func (s *Store) AllSettings() []*domain.Setting {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Setting, len(s.settings.order))
	copy(out, s.settings.order)
	return out
}

// ---------------------------------------------------------------------------
// Foreshadowing
// ---------------------------------------------------------------------------

func (s *Store) AddForeshadowing(f *domain.Foreshadowing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if f != nil {
		names = append(names, f.Name)
		names = append(names, f.DisplayNames...)
	}
	id := ""
	if f != nil {
		id = f.ID
	}
	return addEntity(&s.fores, f, id, names)
}

func (s *Store) Foreshadowing(id string) (*domain.Foreshadowing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.fores, KindForeshadowing, id)
}

func (s *Store) AllForeshadowings() []*domain.Foreshadowing {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Foreshadowing, len(s.fores.order))
	copy(out, s.fores.order)
	return out
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

func (s *Store) AddTimeline(t *domain.Timeline) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if t != nil {
		names = append(names, t.Name)
		names = append(names, t.DisplayNames...)
	}
	id := ""
	if t != nil {
		id = t.ID
	}
	return addEntity(&s.timelines, t, id, names)
}

func (s *Store) Timeline(id string) (*domain.Timeline, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.timelines, KindTimeline, id)
}

func (s *Store) AllTimelines() []*domain.Timeline {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Timeline, len(s.timelines.order))
	copy(out, s.timelines.order)
	return out
}

// ---------------------------------------------------------------------------
// Plot
// ---------------------------------------------------------------------------

func (s *Store) AddPlot(p *domain.Plot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if p != nil {
		names = append(names, p.Name)
		names = append(names, p.DisplayNames...)
	}
	id := ""
	if p != nil {
		id = p.ID
	}
	return addEntity(&s.plots, p, id, names)
}

func (s *Store) Plot(id string) (*domain.Plot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.plots, KindPlot, id)
}

func (s *Store) AllPlots() []*domain.Plot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.Plot, len(s.plots.order))
	copy(out, s.plots.order)
	return out
}

// ---------------------------------------------------------------------------
// CharacterPhase
// ---------------------------------------------------------------------------

func (s *Store) AddCharacterPhase(p *domain.CharacterPhase) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var names []string
	if p != nil {
		names = append(names, p.Name)
		names = append(names, p.DisplayNames...)
	}
	id := ""
	if p != nil {
		id = p.ID
	}
	return addEntity(&s.phases, p, id, names)
}

func (s *Store) CharacterPhase(id string) (*domain.CharacterPhase, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getByID(&s.phases, KindCharacterPhase, id)
}

func (s *Store) AllCharacterPhases() []*domain.CharacterPhase {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*domain.CharacterPhase, len(s.phases.order))
	copy(out, s.phases.order)
	return out
}

// ---------------------------------------------------------------------------
// Cross-kind lookup
// ---------------------------------------------------------------------------

// FindByName resolves a label to entities of the requested kind. The label
// is matched against Name, DisplayNames and (for Character) Aliases. Empty
// slice + nil error means "no hit"; an error is reserved for internal
// inconsistency.
//
// Why: returns []any rather than a typed slice — the helper is the single
// entry point for transports that already branch on Kind, so a uniform
// signature is more useful than six type-specific FindByName* methods. Each
// element is the same pointer type returned by AllX() so callers can type
// assert with confidence.
func (s *Store) FindByName(kind Kind, name string) ([]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	switch kind {
	case KindCharacter:
		hits := s.characters.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	case KindSetting:
		hits := s.settings.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	case KindForeshadowing:
		hits := s.fores.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	case KindTimeline:
		hits := s.timelines.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	case KindPlot:
		hits := s.plots.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	case KindCharacterPhase:
		hits := s.phases.byName[name]
		out := make([]any, 0, len(hits))
		for _, h := range hits {
			out = append(out, h)
		}
		return out, nil
	default:
		// Unknown kind is treated as "no entries" rather than an error, to
		// keep the API symmetric with the no-match case above.
		return []any{}, nil
	}
}
