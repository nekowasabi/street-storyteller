package entity

import (
	"fmt"
	"io"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/tsparse"
)

// LoadCharacter reads a TS `export const NAME = {...};` source describing a
// Character entity and returns the corresponding domain.Character.
//
// Why: Returns *Character (pointer) instead of value — callers typically store
// loaded entities in maps keyed by ID and a pointer avoids per-store copies of
// the heavy nested struct (Details / Phases). Errors are typed *apperrors.Error
// with Code = Parse (tsparse failure) or Validation (mapping failure).
func LoadCharacter(r io.Reader) (*domain.Character, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapCharacter(root)
}

// LoadSetting reads a TS source describing a Setting entity.
func LoadSetting(r io.Reader) (*domain.Setting, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapSetting(root)
}

// LoadForeshadowing reads a TS source describing a Foreshadowing entity.
func LoadForeshadowing(r io.Reader) (*domain.Foreshadowing, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapForeshadowing(root)
}

// LoadTimeline reads a TS source describing a Timeline entity (with embedded events).
func LoadTimeline(r io.Reader) (*domain.Timeline, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapTimeline(root)
}

// LoadSubplot reads a TS source describing a Subplot entity.
func LoadSubplot(r io.Reader) (*domain.Subplot, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapSubplot(root)
}

// LoadCharacterPhase reads a TS source describing a CharacterPhase entity.
func LoadCharacterPhase(r io.Reader) (*domain.CharacterPhase, error) {
	root, err := readRoot(r)
	if err != nil {
		return nil, err
	}
	return mapCharacterPhase(root)
}

// --- shared parsing ---------------------------------------------------------

// readRoot consumes the reader, runs tsparse, and returns the top-level object
// as map[string]any. Anything other than an object literal at the top level is
// rejected as a Parse-class error.
func readRoot(r io.Reader) (map[string]any, error) {
	src, err := io.ReadAll(r)
	if err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeIO, "read entity source")
	}
	res, err := tsparse.ParseExportConst(src)
	if err != nil {
		return nil, apperrors.Wrap(err, apperrors.CodeParse, "parse TS export const")
	}
	obj, ok := res.Value.(map[string]tsparse.Value)
	if !ok {
		return nil, apperrors.New(apperrors.CodeParse, "top-level value must be an object literal")
	}
	// Convert map[string]tsparse.Value -> map[string]any for ergonomic access.
	// tsparse.Value is itself `any`, so this is a re-typing without copy of leaves.
	out := make(map[string]any, len(obj))
	for k, v := range obj {
		out[k] = v
	}
	return out, nil
}

// --- Character mapping -------------------------------------------------------

func mapCharacter(o map[string]any) (*domain.Character, error) {
	c := &domain.Character{}
	var err error

	if c.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if c.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if role, err := decodeRequiredString(o, "role"); err != nil {
		return nil, err
	} else if c.Role, err = decodeCharacterRole(role); err != nil {
		return nil, err
	}
	if c.Traits, err = decodeStringSlice(o, "traits"); err != nil {
		return nil, err
	}
	if c.Relationships, err = decodeRelationships(o, "relationships"); err != nil {
		return nil, err
	}
	if c.AppearingChapters, err = decodeStringSlice(o, "appearingChapters"); err != nil {
		return nil, err
	}
	if c.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}

	if c.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	if c.Aliases, err = decodeOptionalStringSlice(o, "aliases"); err != nil {
		return nil, err
	}
	if c.Pronouns, err = decodeOptionalStringSlice(o, "pronouns"); err != nil {
		return nil, err
	}

	if details, ok, err := getObject(o, "details"); err != nil {
		return nil, err
	} else if ok {
		d, err := mapCharacterDetails(details)
		if err != nil {
			return nil, err
		}
		c.Details = d
	}

	if hints, ok, err := getObject(o, "detectionHints"); err != nil {
		return nil, err
	} else if ok {
		c.DetectionHints, err = mapCharacterDetectionHints(hints)
		if err != nil {
			return nil, err
		}
	}

	// Why: InitialState / Phases / CurrentPhaseID are part of the Wave-A2 schema.
	// Decode if present; rely on optional helpers so absent files load cleanly.
	if init, ok, err := getObject(o, "initialState"); err != nil {
		return nil, err
	} else if ok {
		c.InitialState, err = mapCharacterInitialState(init)
		if err != nil {
			return nil, err
		}
	}
	if phases, ok, err := getArray(o, "phases"); err != nil {
		return nil, err
	} else if ok {
		c.Phases = make([]domain.CharacterPhase, 0, len(phases))
		for i, p := range phases {
			po, ok := p.(map[string]tsparse.Value)
			if !ok {
				return nil, validationf("phases[%d] must be an object", i)
			}
			ph, err := mapCharacterPhase(toAnyMap(po))
			if err != nil {
				return nil, err
			}
			c.Phases = append(c.Phases, *ph)
		}
	}
	if cur, ok, err := getString(o, "currentPhaseId"); err != nil {
		return nil, err
	} else if ok {
		c.CurrentPhaseID = &cur
	}

	return c, nil
}

func mapCharacterDetails(o map[string]any) (*domain.CharacterDetails, error) {
	d := &domain.CharacterDetails{}
	var err error
	if d.Description, err = decodeStringOrFileRef(o, "description"); err != nil {
		return nil, err
	}
	if d.Appearance, err = decodeStringOrFileRef(o, "appearance"); err != nil {
		return nil, err
	}
	if d.Personality, err = decodeStringOrFileRef(o, "personality"); err != nil {
		return nil, err
	}
	if d.Backstory, err = decodeStringOrFileRef(o, "backstory"); err != nil {
		return nil, err
	}
	if d.RelationshipsDetail, err = decodeStringOrFileRef(o, "relationshipsDetail"); err != nil {
		return nil, err
	}
	if d.Goals, err = decodeStringOrFileRef(o, "goals"); err != nil {
		return nil, err
	}
	if dev, ok, err := getObject(o, "development"); err != nil {
		return nil, err
	} else if ok {
		d.Development, err = mapCharacterDevelopment(dev)
		if err != nil {
			return nil, err
		}
	}
	return d, nil
}

func mapCharacterDevelopment(o map[string]any) (*domain.CharacterDevelopment, error) {
	dev := &domain.CharacterDevelopment{}
	var err error
	if dev.Initial, err = decodeOptionalString(o, "initial"); err != nil {
		return nil, err
	}
	if dev.Goal, err = decodeOptionalString(o, "goal"); err != nil {
		return nil, err
	}
	if dev.Obstacle, err = decodeOptionalString(o, "obstacle"); err != nil {
		return nil, err
	}
	if r, ok, err := getString(o, "resolution"); err != nil {
		return nil, err
	} else if ok {
		dev.Resolution = &r
	}
	if dev.ArcNotes, err = decodeStringOrFileRef(o, "arcNotes"); err != nil {
		return nil, err
	}
	return dev, nil
}

func mapCharacterDetectionHints(o map[string]any) (*domain.CharacterDetectionHints, error) {
	h := &domain.CharacterDetectionHints{}
	var err error
	if h.CommonPatterns, err = decodeOptionalStringSlice(o, "commonPatterns"); err != nil {
		return nil, err
	}
	if h.ExcludePatterns, err = decodeOptionalStringSlice(o, "excludePatterns"); err != nil {
		return nil, err
	}
	if h.Confidence, err = decodeOptionalFloat(o, "confidence"); err != nil {
		return nil, err
	}
	return h, nil
}

func mapCharacterInitialState(o map[string]any) (*domain.CharacterInitialState, error) {
	s := &domain.CharacterInitialState{}
	var err error
	if s.Traits, err = decodeOptionalStringSlice(o, "traits"); err != nil {
		return nil, err
	}
	if s.Beliefs, err = decodeOptionalStringSlice(o, "beliefs"); err != nil {
		return nil, err
	}
	if s.Abilities, err = decodeOptionalStringSlice(o, "abilities"); err != nil {
		return nil, err
	}
	if rel, ok, err := getObject(o, "relationships"); err != nil {
		return nil, err
	} else if ok {
		s.Relationships, err = relationshipsFromObject(rel)
		if err != nil {
			return nil, err
		}
	}
	if s.Appearance, err = decodeOptionalStringSlice(o, "appearance"); err != nil {
		return nil, err
	}
	if status, ok, err := getObject(o, "status"); err != nil {
		return nil, err
	} else if ok {
		s.Status = mapStatusDelta(status)
	}
	if s.Goals, err = decodeOptionalStringSlice(o, "goals"); err != nil {
		return nil, err
	}
	return s, nil
}

// --- Setting mapping ---------------------------------------------------------

func mapSetting(o map[string]any) (*domain.Setting, error) {
	s := &domain.Setting{}
	var err error
	if s.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if s.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if t, err := decodeRequiredString(o, "type"); err != nil {
		return nil, err
	} else if s.Type, err = decodeSettingType(t); err != nil {
		return nil, err
	}
	if s.AppearingChapters, err = decodeStringSlice(o, "appearingChapters"); err != nil {
		return nil, err
	}
	if s.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}
	if s.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	if s.RelatedSettings, err = decodeOptionalStringSlice(o, "relatedSettings"); err != nil {
		return nil, err
	}
	if details, ok, err := getObject(o, "details"); err != nil {
		return nil, err
	} else if ok {
		s.Details = mapSettingDetails(details)
	}
	if hints, ok, err := getObject(o, "detectionHints"); err != nil {
		return nil, err
	} else if ok {
		h := &domain.SettingDetectionHints{}
		if h.CommonPatterns, err = decodeOptionalStringSlice(hints, "commonPatterns"); err != nil {
			return nil, err
		}
		if h.ExcludePatterns, err = decodeOptionalStringSlice(hints, "excludePatterns"); err != nil {
			return nil, err
		}
		if h.Confidence, err = decodeOptionalFloat(hints, "confidence"); err != nil {
			return nil, err
		}
		s.DetectionHints = h
	}
	return s, nil
}

func mapSettingDetails(o map[string]any) *domain.SettingDetails {
	d := &domain.SettingDetails{}
	d.Description = optionalStringOrFileRef(o, "description")
	d.Geography = optionalStringOrFileRef(o, "geography")
	d.History = optionalStringOrFileRef(o, "history")
	d.Culture = optionalStringOrFileRef(o, "culture")
	d.Politics = optionalStringOrFileRef(o, "politics")
	d.Economy = optionalStringOrFileRef(o, "economy")
	d.Inhabitants = optionalStringOrFileRef(o, "inhabitants")
	d.Landmarks = optionalStringOrFileRef(o, "landmarks")
	return d
}

// --- Foreshadowing mapping ---------------------------------------------------

func mapForeshadowing(o map[string]any) (*domain.Foreshadowing, error) {
	f := &domain.Foreshadowing{}
	var err error
	if f.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if f.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if t, err := decodeRequiredString(o, "type"); err != nil {
		return nil, err
	} else if f.Type, err = decodeForeshadowingType(t); err != nil {
		return nil, err
	}
	if f.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}
	if planting, ok, err := getObject(o, "planting"); err != nil {
		return nil, err
	} else if !ok {
		return nil, validationf("planting is required")
	} else if f.Planting, err = mapPlantingInfo(planting); err != nil {
		return nil, err
	}
	if st, err := decodeRequiredString(o, "status"); err != nil {
		return nil, err
	} else if f.Status, err = decodeForeshadowingStatus(st); err != nil {
		return nil, err
	}

	if imp, ok, err := getString(o, "importance"); err != nil {
		return nil, err
	} else if ok {
		v, err := decodeForeshadowingImportance(imp)
		if err != nil {
			return nil, err
		}
		f.Importance = &v
	}

	if rs, ok, err := getArray(o, "resolutions"); err != nil {
		return nil, err
	} else if ok {
		f.Resolutions = make([]domain.ResolutionInfo, 0, len(rs))
		for i, r := range rs {
			ro, ok := r.(map[string]tsparse.Value)
			if !ok {
				return nil, validationf("resolutions[%d] must be an object", i)
			}
			ri, err := mapResolutionInfo(toAnyMap(ro))
			if err != nil {
				return nil, err
			}
			f.Resolutions = append(f.Resolutions, ri)
		}
	}

	if pr, ok, err := getString(o, "plannedResolutionChapter"); err != nil {
		return nil, err
	} else if ok {
		f.PlannedResolutionChapter = &pr
	}

	if rel, ok, err := getObject(o, "relations"); err != nil {
		return nil, err
	} else if ok {
		fr := &domain.ForeshadowingRelations{}
		if fr.Characters, err = decodeOptionalStringSlice(rel, "characters"); err != nil {
			return nil, err
		}
		if fr.Settings, err = decodeOptionalStringSlice(rel, "settings"); err != nil {
			return nil, err
		}
		if fr.RelatedForeshadowings, err = decodeOptionalStringSlice(rel, "relatedForeshadowings"); err != nil {
			return nil, err
		}
		f.Relations = fr
	}

	if f.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	return f, nil
}

func mapPlantingInfo(o map[string]any) (domain.PlantingInfo, error) {
	p := domain.PlantingInfo{}
	var err error
	if p.Chapter, err = decodeRequiredString(o, "chapter"); err != nil {
		return p, err
	}
	if p.Description, err = decodeRequiredString(o, "description"); err != nil {
		return p, err
	}
	p.Excerpt = optionalStringOrFileRef(o, "excerpt")
	if eid, ok, err := getString(o, "eventId"); err != nil {
		return p, err
	} else if ok {
		p.EventID = &eid
	}
	return p, nil
}

func mapResolutionInfo(o map[string]any) (domain.ResolutionInfo, error) {
	r := domain.ResolutionInfo{}
	var err error
	if r.Chapter, err = decodeRequiredString(o, "chapter"); err != nil {
		return r, err
	}
	if r.Description, err = decodeRequiredString(o, "description"); err != nil {
		return r, err
	}
	r.Excerpt = optionalStringOrFileRef(o, "excerpt")
	if eid, ok, err := getString(o, "eventId"); err != nil {
		return r, err
	} else if ok {
		r.EventID = &eid
	}
	if r.Completeness, err = decodeOptionalFloat(o, "completeness"); err != nil {
		return r, err
	}
	return r, nil
}

// --- Timeline mapping --------------------------------------------------------

func mapTimeline(o map[string]any) (*domain.Timeline, error) {
	t := &domain.Timeline{}
	var err error
	if t.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if t.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if sc, err := decodeRequiredString(o, "scope"); err != nil {
		return nil, err
	} else if t.Scope, err = decodeTimelineScope(sc); err != nil {
		return nil, err
	}
	if t.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}
	if events, ok, err := getArray(o, "events"); err != nil {
		return nil, err
	} else if !ok {
		t.Events = []domain.TimelineEvent{}
	} else {
		t.Events = make([]domain.TimelineEvent, 0, len(events))
		for i, e := range events {
			eo, ok := e.(map[string]tsparse.Value)
			if !ok {
				return nil, validationf("events[%d] must be an object", i)
			}
			ev, err := mapTimelineEvent(toAnyMap(eo))
			if err != nil {
				return nil, err
			}
			t.Events = append(t.Events, ev)
		}
	}

	if pt, ok, err := getString(o, "parentTimeline"); err != nil {
		return nil, err
	} else if ok {
		t.ParentTimeline = &pt
	}
	if t.ChildTimelines, err = decodeOptionalStringSlice(o, "childTimelines"); err != nil {
		return nil, err
	}
	if rc, ok, err := getString(o, "relatedCharacter"); err != nil {
		return nil, err
	} else if ok {
		t.RelatedCharacter = &rc
	}
	if t.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	if hints, ok, err := getObject(o, "detectionHints"); err != nil {
		return nil, err
	} else if ok {
		h := &domain.TimelineDetectionHints{}
		if h.CommonPatterns, err = decodeOptionalStringSlice(hints, "commonPatterns"); err != nil {
			return nil, err
		}
		if h.ExcludePatterns, err = decodeOptionalStringSlice(hints, "excludePatterns"); err != nil {
			return nil, err
		}
		if h.Confidence, err = decodeOptionalFloat(hints, "confidence"); err != nil {
			return nil, err
		}
		t.DetectionHints = h
	}
	if details, ok, err := getObject(o, "details"); err != nil {
		return nil, err
	} else if ok {
		td := &domain.TimelineDetails{}
		td.Background = optionalStringOrFileRef(details, "background")
		td.Notes = optionalStringOrFileRef(details, "notes")
		t.Details = td
	}
	if disp, ok, err := getObject(o, "displayOptions"); err != nil {
		return nil, err
	} else if ok {
		do := &domain.TimelineDisplayOptions{}
		if b, ok, err := getBool(disp, "showRelations"); err != nil {
			return nil, err
		} else if ok {
			do.ShowRelations = &b
		}
		if cs, ok, err := getString(disp, "colorScheme"); err != nil {
			return nil, err
		} else if ok {
			do.ColorScheme = &cs
		}
		if b, ok, err := getBool(disp, "collapsed"); err != nil {
			return nil, err
		} else if ok {
			do.Collapsed = &b
		}
		t.DisplayOptions = do
	}
	return t, nil
}

func mapTimelineEvent(o map[string]any) (domain.TimelineEvent, error) {
	e := domain.TimelineEvent{}
	var err error
	if e.ID, err = decodeRequiredString(o, "id"); err != nil {
		return e, err
	}
	if e.Title, err = decodeRequiredString(o, "title"); err != nil {
		return e, err
	}
	if cat, err := decodeRequiredString(o, "category"); err != nil {
		return e, err
	} else if e.Category, err = decodeEventCategory(cat); err != nil {
		return e, err
	}
	if tp, ok, err := getObject(o, "time"); err != nil {
		return e, err
	} else if !ok {
		return e, validationf("event %s: time is required", e.ID)
	} else if e.Time, err = mapTimePoint(tp); err != nil {
		return e, err
	}
	if e.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return e, err
	}
	if e.Characters, err = decodeStringSlice(o, "characters"); err != nil {
		return e, err
	}
	if e.Settings, err = decodeStringSlice(o, "settings"); err != nil {
		return e, err
	}
	if e.Chapters, err = decodeStringSlice(o, "chapters"); err != nil {
		return e, err
	}

	if e.CausedBy, err = decodeOptionalStringSlice(o, "causedBy"); err != nil {
		return e, err
	}
	if e.Causes, err = decodeOptionalStringSlice(o, "causes"); err != nil {
		return e, err
	}
	if imp, ok, err := getString(o, "importance"); err != nil {
		return e, err
	} else if ok {
		v, err := decodeEventImportance(imp)
		if err != nil {
			return e, err
		}
		e.Importance = &v
	}
	if etp, ok, err := getObject(o, "endTime"); err != nil {
		return e, err
	} else if ok {
		ep, err := mapTimePoint(etp)
		if err != nil {
			return e, err
		}
		e.EndTime = &ep
	}
	if e.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return e, err
	}
	if details, ok, err := getObject(o, "details"); err != nil {
		return e, err
	} else if ok {
		ed := &domain.TimelineEventDetails{}
		ed.Description = optionalStringOrFileRef(details, "description")
		ed.Impact = optionalStringOrFileRef(details, "impact")
		ed.Notes = optionalStringOrFileRef(details, "notes")
		e.Details = ed
	}
	if hints, ok, err := getObject(o, "detectionHints"); err != nil {
		return e, err
	} else if ok {
		h := &domain.TimelineEventDetectionHints{}
		if h.CommonPatterns, err = decodeOptionalStringSlice(hints, "commonPatterns"); err != nil {
			return e, err
		}
		if h.ExcludePatterns, err = decodeOptionalStringSlice(hints, "excludePatterns"); err != nil {
			return e, err
		}
		if h.Confidence, err = decodeOptionalFloat(hints, "confidence"); err != nil {
			return e, err
		}
		e.DetectionHints = h
	}
	if changes, ok, err := getArray(o, "phaseChanges"); err != nil {
		return e, err
	} else if ok {
		e.PhaseChanges = make([]domain.PhaseChangeInfo, 0, len(changes))
		for i, c := range changes {
			co, ok := c.(map[string]tsparse.Value)
			if !ok {
				return e, validationf("phaseChanges[%d] must be an object", i)
			}
			pc, err := mapPhaseChangeInfo(toAnyMap(co))
			if err != nil {
				return e, err
			}
			e.PhaseChanges = append(e.PhaseChanges, pc)
		}
	}
	return e, nil
}

func mapTimePoint(o map[string]any) (domain.TimePoint, error) {
	tp := domain.TimePoint{}
	if order, err := decodeRequiredFloat(o, "order"); err != nil {
		return tp, err
	} else {
		tp.Order = int(order)
	}
	if l, ok, err := getString(o, "label"); err != nil {
		return tp, err
	} else if ok {
		tp.Label = &l
	}
	if d, ok, err := getString(o, "date"); err != nil {
		return tp, err
	} else if ok {
		tp.Date = &d
	}
	if c, ok, err := getString(o, "chapter"); err != nil {
		return tp, err
	} else if ok {
		tp.Chapter = &c
	}
	return tp, nil
}

func mapPhaseChangeInfo(o map[string]any) (domain.PhaseChangeInfo, error) {
	pc := domain.PhaseChangeInfo{}
	var err error
	if pc.CharacterID, err = decodeRequiredString(o, "characterId"); err != nil {
		return pc, err
	}
	if pc.ToPhaseID, err = decodeRequiredString(o, "toPhaseId"); err != nil {
		return pc, err
	}
	if v, ok, err := getString(o, "fromPhaseId"); err != nil {
		return pc, err
	} else if ok {
		pc.FromPhaseID = &v
	}
	if v, ok, err := getString(o, "description"); err != nil {
		return pc, err
	} else if ok {
		pc.Description = &v
	}
	return pc, nil
}

// --- Subplot mapping ---------------------------------------------------------

func mapSubplot(o map[string]any) (*domain.Subplot, error) {
	s := &domain.Subplot{}
	var err error
	if s.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if s.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if v, err := decodeRequiredString(o, "type"); err != nil {
		return nil, err
	} else if s.Type, err = decodeSubplotType(v); err != nil {
		return nil, err
	}
	if v, err := decodeRequiredString(o, "status"); err != nil {
		return nil, err
	} else if s.Status, err = decodeSubplotStatus(v); err != nil {
		return nil, err
	}
	if s.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}

	if beats, ok, err := getArray(o, "beats"); err != nil {
		return nil, err
	} else if !ok {
		s.Beats = []domain.PlotBeat{}
	} else {
		s.Beats = make([]domain.PlotBeat, 0, len(beats))
		for i, b := range beats {
			bo, ok := b.(map[string]tsparse.Value)
			if !ok {
				return nil, validationf("beats[%d] must be an object", i)
			}
			beat, err := mapPlotBeat(toAnyMap(bo))
			if err != nil {
				return nil, err
			}
			s.Beats = append(s.Beats, beat)
		}
	}

	if fc, ok, err := getObject(o, "focusCharacters"); err != nil {
		return nil, err
	} else if ok {
		s.FocusCharacters = make(map[string]domain.FocusCharacterPriority, len(fc))
		for k, v := range fc {
			str, ok := v.(string)
			if !ok {
				return nil, validationf("focusCharacters[%s] must be string", k)
			}
			fcp, err := decodeFocusCharacterPriority(str)
			if err != nil {
				return nil, err
			}
			s.FocusCharacters[k] = fcp
		}
	}

	if inters, ok, err := getArray(o, "intersections"); err != nil {
		return nil, err
	} else if ok {
		s.Intersections = make([]domain.PlotIntersection, 0, len(inters))
		for i, x := range inters {
			xo, ok := x.(map[string]tsparse.Value)
			if !ok {
				return nil, validationf("intersections[%d] must be an object", i)
			}
			pi, err := mapPlotIntersection(toAnyMap(xo))
			if err != nil {
				return nil, err
			}
			s.Intersections = append(s.Intersections, pi)
		}
	}

	if imp, ok, err := getString(o, "importance"); err != nil {
		return nil, err
	} else if ok {
		v, err := decodeSubplotImportance(imp)
		if err != nil {
			return nil, err
		}
		s.Importance = &v
	}
	if v, ok, err := getString(o, "parentSubplotId"); err != nil {
		return nil, err
	} else if ok {
		s.ParentSubplotID = &v
	}
	if s.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	if details, ok, err := getObject(o, "details"); err != nil {
		return nil, err
	} else if ok {
		sd := &domain.SubplotDetails{}
		if sd.Description, err = decodeStringOrFileRef(details, "description"); err != nil {
			return nil, err
		}
		if sd.Theme, err = decodeStringOrFileRef(details, "theme"); err != nil {
			return nil, err
		}
		if sd.Notes, err = decodeStringOrFileRef(details, "notes"); err != nil {
			return nil, err
		}
		s.Details = sd
	}
	if rel, ok, err := getObject(o, "relations"); err != nil {
		return nil, err
	} else if ok {
		sr := &domain.SubplotRelations{}
		if sr.Characters, err = decodeOptionalStringSlice(rel, "characters"); err != nil {
			return nil, err
		}
		if sr.Settings, err = decodeOptionalStringSlice(rel, "settings"); err != nil {
			return nil, err
		}
		if sr.Foreshadowings, err = decodeOptionalStringSlice(rel, "foreshadowings"); err != nil {
			return nil, err
		}
		if sr.RelatedSubplots, err = decodeOptionalStringSlice(rel, "relatedSubplots"); err != nil {
			return nil, err
		}
		s.Relations = sr
	}
	return s, nil
}

func mapPlotBeat(o map[string]any) (domain.PlotBeat, error) {
	b := domain.PlotBeat{}
	var err error
	if b.ID, err = decodeRequiredString(o, "id"); err != nil {
		return b, err
	}
	if b.Title, err = decodeRequiredString(o, "title"); err != nil {
		return b, err
	}
	if b.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return b, err
	}
	if v, err := decodeRequiredString(o, "structurePosition"); err != nil {
		return b, err
	} else if b.StructurePosition, err = decodeStructurePosition(v); err != nil {
		return b, err
	}
	if v, ok, err := getString(o, "chapter"); err != nil {
		return b, err
	} else if ok {
		b.Chapter = &v
	}
	if b.Characters, err = decodeOptionalStringSlice(o, "characters"); err != nil {
		return b, err
	}
	if b.Settings, err = decodeOptionalStringSlice(o, "settings"); err != nil {
		return b, err
	}
	if v, ok, err := getString(o, "timelineEventId"); err != nil {
		return b, err
	} else if ok {
		b.TimelineEventID = &v
	}
	if b.PreconditionBeatIDs, err = decodeOptionalStringSlice(o, "preconditionBeatIds"); err != nil {
		return b, err
	}
	return b, nil
}

func mapPlotIntersection(o map[string]any) (domain.PlotIntersection, error) {
	x := domain.PlotIntersection{}
	var err error
	if x.ID, err = decodeRequiredString(o, "id"); err != nil {
		return x, err
	}
	if x.SourceSubplotID, err = decodeRequiredString(o, "sourceSubplotId"); err != nil {
		return x, err
	}
	if x.SourceBeatID, err = decodeRequiredString(o, "sourceBeatId"); err != nil {
		return x, err
	}
	if x.TargetSubplotID, err = decodeRequiredString(o, "targetSubplotId"); err != nil {
		return x, err
	}
	if x.TargetBeatID, err = decodeRequiredString(o, "targetBeatId"); err != nil {
		return x, err
	}
	if x.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return x, err
	}
	if v, err := decodeRequiredString(o, "influenceDirection"); err != nil {
		return x, err
	} else if x.InfluenceDirection, err = decodeInfluenceDirection(v); err != nil {
		return x, err
	}
	if v, ok, err := getString(o, "influenceLevel"); err != nil {
		return x, err
	} else if ok {
		lvl, err := decodeInfluenceLevel(v)
		if err != nil {
			return x, err
		}
		x.InfluenceLevel = &lvl
	}
	return x, nil
}

// --- CharacterPhase mapping --------------------------------------------------

func mapCharacterPhase(o map[string]any) (*domain.CharacterPhase, error) {
	p := &domain.CharacterPhase{}
	var err error
	if p.ID, err = decodeRequiredString(o, "id"); err != nil {
		return nil, err
	}
	if p.Name, err = decodeRequiredString(o, "name"); err != nil {
		return nil, err
	}
	if order, err := decodeRequiredFloat(o, "order"); err != nil {
		return nil, err
	} else {
		p.Order = int(order)
	}
	if p.Summary, err = decodeRequiredString(o, "summary"); err != nil {
		return nil, err
	}
	if delta, ok, err := getObject(o, "delta"); err != nil {
		return nil, err
	} else if !ok {
		return nil, validationf("delta is required")
	} else if p.Delta, err = mapCharacterStateDelta(delta); err != nil {
		return nil, err
	}

	if v, ok, err := getString(o, "transitionType"); err != nil {
		return nil, err
	} else if ok {
		tt, err := decodeTransitionType(v)
		if err != nil {
			return nil, err
		}
		p.TransitionType = &tt
	}
	if v, ok, err := getString(o, "importance"); err != nil {
		return nil, err
	} else if ok {
		pi, err := decodePhaseImportance(v)
		if err != nil {
			return nil, err
		}
		p.Importance = &pi
	}
	if v, ok, err := getString(o, "triggerEventId"); err != nil {
		return nil, err
	} else if ok {
		p.TriggerEventID = &v
	}
	if v, ok, err := getString(o, "timelineId"); err != nil {
		return nil, err
	} else if ok {
		p.TimelineID = &v
	}
	if v, ok, err := getString(o, "startChapter"); err != nil {
		return nil, err
	} else if ok {
		p.StartChapter = &v
	}
	if v, ok, err := getString(o, "endChapter"); err != nil {
		return nil, err
	} else if ok {
		p.EndChapter = &v
	}
	if details, ok, err := getObject(o, "details"); err != nil {
		return nil, err
	} else if ok {
		pd := &domain.PhaseDetails{}
		if pd.Description, err = decodeStringOrFileRef(details, "description"); err != nil {
			return nil, err
		}
		if pd.InternalChange, err = decodeStringOrFileRef(details, "internalChange"); err != nil {
			return nil, err
		}
		if pd.ExternalChange, err = decodeStringOrFileRef(details, "externalChange"); err != nil {
			return nil, err
		}
		if pd.Catalyst, err = decodeStringOrFileRef(details, "catalyst"); err != nil {
			return nil, err
		}
		if pd.Notes, err = decodeStringOrFileRef(details, "notes"); err != nil {
			return nil, err
		}
		p.Details = pd
	}
	if p.DisplayNames, err = decodeOptionalStringSlice(o, "displayNames"); err != nil {
		return nil, err
	}
	return p, nil
}

func mapCharacterStateDelta(o map[string]any) (domain.CharacterStateDelta, error) {
	d := domain.CharacterStateDelta{}
	var err error
	if traits, ok, err := getObject(o, "traits"); err != nil {
		return d, err
	} else if ok {
		ad, err := mapArrayDelta(traits)
		if err != nil {
			return d, err
		}
		d.Traits = ad
	}
	if beliefs, ok, err := getObject(o, "beliefs"); err != nil {
		return d, err
	} else if ok {
		ad, err := mapArrayDelta(beliefs)
		if err != nil {
			return d, err
		}
		d.Beliefs = ad
	}
	if abil, ok, err := getObject(o, "abilities"); err != nil {
		return d, err
	} else if ok {
		ad := &domain.AbilitiesDelta{}
		if ad.Add, err = decodeOptionalStringSlice(abil, "add"); err != nil {
			return d, err
		}
		if ad.Remove, err = decodeOptionalStringSlice(abil, "remove"); err != nil {
			return d, err
		}
		if ad.Improve, err = decodeOptionalStringSlice(abil, "improve"); err != nil {
			return d, err
		}
		if ad.Degrade, err = decodeOptionalStringSlice(abil, "degrade"); err != nil {
			return d, err
		}
		d.Abilities = ad
	}
	if rel, ok, err := getObject(o, "relationships"); err != nil {
		return d, err
	} else if ok {
		rd := &domain.RelationshipsDelta{}
		if add, ok, err := getObject(rel, "add"); err != nil {
			return d, err
		} else if ok {
			rd.Add, err = relationshipsFromObject(add)
			if err != nil {
				return d, err
			}
		}
		if rd.Remove, err = decodeOptionalStringSlice(rel, "remove"); err != nil {
			return d, err
		}
		if change, ok, err := getObject(rel, "change"); err != nil {
			return d, err
		} else if ok {
			rd.Change, err = relationshipsFromObject(change)
			if err != nil {
				return d, err
			}
		}
		d.Relationships = rd
	}
	if app, ok, err := getObject(o, "appearance"); err != nil {
		return d, err
	} else if ok {
		ad, err := mapArrayDelta(app)
		if err != nil {
			return d, err
		}
		d.Appearance = ad
	}
	if status, ok, err := getObject(o, "status"); err != nil {
		return d, err
	} else if ok {
		sd := mapStatusDelta(status)
		d.Status = sd
	}
	if goals, ok, err := getObject(o, "goals"); err != nil {
		return d, err
	} else if ok {
		ad, err := mapArrayDelta(goals)
		if err != nil {
			return d, err
		}
		d.Goals = ad
	}
	if d.Summary, err = decodeOptionalString(o, "summary"); err != nil {
		return d, err
	}
	return d, nil
}

func mapArrayDelta(o map[string]any) (*domain.ArrayDelta, error) {
	ad := &domain.ArrayDelta{}
	var err error
	if ad.Add, err = decodeOptionalStringSlice(o, "add"); err != nil {
		return nil, err
	}
	if ad.Remove, err = decodeOptionalStringSlice(o, "remove"); err != nil {
		return nil, err
	}
	if mod, ok, err := getObject(o, "modify"); err != nil {
		return nil, err
	} else if ok {
		ad.Modify = make(map[string]string, len(mod))
		for k, v := range mod {
			s, ok := v.(string)
			if !ok {
				return nil, validationf("modify[%s] must be string", k)
			}
			ad.Modify[k] = s
		}
	}
	return ad, nil
}

func mapStatusDelta(o map[string]any) *domain.StatusDelta {
	sd := &domain.StatusDelta{}
	if v, ok := o["physical"].(string); ok {
		sd.Physical = v
	}
	if v, ok := o["mental"].(string); ok {
		sd.Mental = v
	}
	if v, ok := o["social"].(string); ok {
		sd.Social = v
	}
	return sd
}

// --- enum decoders -----------------------------------------------------------

func decodeCharacterRole(s string) (domain.CharacterRole, error) {
	switch domain.CharacterRole(s) {
	case domain.RoleProtagonist, domain.RoleAntagonist, domain.RoleSupporting, domain.RoleGuest:
		return domain.CharacterRole(s), nil
	}
	return "", validationf("unknown character role %q", s)
}

func decodeRelationType(s string) (domain.RelationType, error) {
	switch domain.RelationType(s) {
	case domain.RelationAlly, domain.RelationEnemy, domain.RelationNeutral,
		domain.RelationRomantic, domain.RelationRespect, domain.RelationCompetitive,
		domain.RelationMentor:
		return domain.RelationType(s), nil
	}
	return "", validationf("unknown relation type %q", s)
}

func decodeSettingType(s string) (domain.SettingType, error) {
	switch domain.SettingType(s) {
	case domain.SettingTypeLocation, domain.SettingTypeWorld,
		domain.SettingTypeCulture, domain.SettingTypeOrganization:
		return domain.SettingType(s), nil
	}
	return "", validationf("unknown setting type %q", s)
}

func decodeForeshadowingType(s string) (domain.ForeshadowingType, error) {
	switch domain.ForeshadowingType(s) {
	case domain.ForeshadowingTypeHint, domain.ForeshadowingTypeProphecy,
		domain.ForeshadowingTypeMystery, domain.ForeshadowingTypeSymbol,
		domain.ForeshadowingTypeChekhov, domain.ForeshadowingTypeRedHerring:
		return domain.ForeshadowingType(s), nil
	}
	return "", validationf("unknown foreshadowing type %q", s)
}

func decodeForeshadowingStatus(s string) (domain.ForeshadowingStatus, error) {
	switch domain.ForeshadowingStatus(s) {
	case domain.ForeshadowingStatusPlanted, domain.ForeshadowingStatusPartiallyResolved,
		domain.ForeshadowingStatusResolved, domain.ForeshadowingStatusAbandoned:
		return domain.ForeshadowingStatus(s), nil
	}
	return "", validationf("unknown foreshadowing status %q", s)
}

func decodeForeshadowingImportance(s string) (domain.ForeshadowingImportance, error) {
	switch domain.ForeshadowingImportance(s) {
	case domain.ForeshadowingImportanceMajor, domain.ForeshadowingImportanceMinor,
		domain.ForeshadowingImportanceSubtle:
		return domain.ForeshadowingImportance(s), nil
	}
	return "", validationf("unknown foreshadowing importance %q", s)
}

func decodeTimelineScope(s string) (domain.TimelineScope, error) {
	switch domain.TimelineScope(s) {
	case domain.TimelineScopeStory, domain.TimelineScopeWorld,
		domain.TimelineScopeCharacter, domain.TimelineScopeArc:
		return domain.TimelineScope(s), nil
	}
	return "", validationf("unknown timeline scope %q", s)
}

func decodeEventCategory(s string) (domain.EventCategory, error) {
	switch domain.EventCategory(s) {
	case domain.EventCategoryPlotPoint, domain.EventCategoryCharacterEvent,
		domain.EventCategoryWorldEvent, domain.EventCategoryBackstory,
		domain.EventCategoryForeshadow, domain.EventCategoryClimax,
		domain.EventCategoryResolution:
		return domain.EventCategory(s), nil
	}
	return "", validationf("unknown event category %q", s)
}

func decodeEventImportance(s string) (domain.EventImportance, error) {
	switch domain.EventImportance(s) {
	case domain.EventImportanceMajor, domain.EventImportanceMinor, domain.EventImportanceBackground:
		return domain.EventImportance(s), nil
	}
	return "", validationf("unknown event importance %q", s)
}

func decodeSubplotType(s string) (domain.SubplotType, error) {
	switch domain.SubplotType(s) {
	case domain.SubplotTypeMain, domain.SubplotTypeSubplot,
		domain.SubplotTypeParallel, domain.SubplotTypeBackground:
		return domain.SubplotType(s), nil
	}
	return "", validationf("unknown subplot type %q", s)
}

func decodeSubplotStatus(s string) (domain.SubplotStatus, error) {
	switch domain.SubplotStatus(s) {
	case domain.SubplotStatusActive, domain.SubplotStatusCompleted:
		return domain.SubplotStatus(s), nil
	}
	return "", validationf("unknown subplot status %q", s)
}

func decodeSubplotImportance(s string) (domain.SubplotImportance, error) {
	switch domain.SubplotImportance(s) {
	case domain.SubplotImportanceMajor, domain.SubplotImportanceMinor:
		return domain.SubplotImportance(s), nil
	}
	return "", validationf("unknown subplot importance %q", s)
}

func decodeFocusCharacterPriority(s string) (domain.FocusCharacterPriority, error) {
	switch domain.FocusCharacterPriority(s) {
	case domain.FocusCharacterPriorityPrimary, domain.FocusCharacterPrioritySecondary:
		return domain.FocusCharacterPriority(s), nil
	}
	return "", validationf("unknown focus character priority %q", s)
}

func decodeStructurePosition(s string) (domain.StructurePosition, error) {
	switch domain.StructurePosition(s) {
	case domain.StructurePositionSetup, domain.StructurePositionRising,
		domain.StructurePositionClimax, domain.StructurePositionFalling,
		domain.StructurePositionResolution:
		return domain.StructurePosition(s), nil
	}
	return "", validationf("unknown structure position %q", s)
}

func decodeInfluenceDirection(s string) (domain.InfluenceDirection, error) {
	switch domain.InfluenceDirection(s) {
	case domain.InfluenceDirectionForward, domain.InfluenceDirectionBackward,
		domain.InfluenceDirectionMutual:
		return domain.InfluenceDirection(s), nil
	}
	return "", validationf("unknown influence direction %q", s)
}

func decodeInfluenceLevel(s string) (domain.InfluenceLevel, error) {
	switch domain.InfluenceLevel(s) {
	case domain.InfluenceLevelHigh, domain.InfluenceLevelMedium, domain.InfluenceLevelLow:
		return domain.InfluenceLevel(s), nil
	}
	return "", validationf("unknown influence level %q", s)
}

func decodeTransitionType(s string) (domain.TransitionType, error) {
	switch domain.TransitionType(s) {
	case domain.TransitionGradual, domain.TransitionTurningPoint,
		domain.TransitionRevelation, domain.TransitionRegression,
		domain.TransitionTransformation:
		return domain.TransitionType(s), nil
	}
	return "", validationf("unknown transition type %q", s)
}

func decodePhaseImportance(s string) (domain.PhaseImportance, error) {
	switch domain.PhaseImportance(s) {
	case domain.PhaseImportanceMajor, domain.PhaseImportanceMinor, domain.PhaseImportanceSubtle:
		return domain.PhaseImportance(s), nil
	}
	return "", validationf("unknown phase importance %q", s)
}

// --- generic field helpers ---------------------------------------------------

// validationf produces a typed Validation error via fmt.Sprintf. Centralized so
// the package speaks one error vocabulary (apperrors.CodeValidation) for all
// mapping failures.
func validationf(format string, args ...any) error {
	return apperrors.New(apperrors.CodeValidation, fmt.Sprintf(format, args...))
}

func decodeRequiredString(o map[string]any, key string) (string, error) {
	v, ok := o[key]
	if !ok {
		return "", validationf("%s is required", key)
	}
	s, ok := v.(string)
	if !ok {
		return "", validationf("%s must be string, got %T", key, v)
	}
	return s, nil
}

func decodeOptionalString(o map[string]any, key string) (string, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return "", nil
	}
	s, ok := v.(string)
	if !ok {
		return "", validationf("%s must be string, got %T", key, v)
	}
	return s, nil
}

func decodeRequiredFloat(o map[string]any, key string) (float64, error) {
	v, ok := o[key]
	if !ok {
		return 0, validationf("%s is required", key)
	}
	f, ok := v.(float64)
	if !ok {
		return 0, validationf("%s must be number, got %T", key, v)
	}
	return f, nil
}

func decodeOptionalFloat(o map[string]any, key string) (float64, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return 0, nil
	}
	f, ok := v.(float64)
	if !ok {
		return 0, validationf("%s must be number, got %T", key, v)
	}
	return f, nil
}

func decodeStringSlice(o map[string]any, key string) ([]string, error) {
	v, ok := o[key]
	if !ok {
		return nil, validationf("%s is required", key)
	}
	return toStringSlice(key, v)
}

func decodeOptionalStringSlice(o map[string]any, key string) ([]string, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return nil, nil
	}
	return toStringSlice(key, v)
}

func toStringSlice(key string, v any) ([]string, error) {
	arr, ok := v.([]tsparse.Value)
	if !ok {
		return nil, validationf("%s must be array, got %T", key, v)
	}
	out := make([]string, 0, len(arr))
	for i, item := range arr {
		s, ok := item.(string)
		if !ok {
			return nil, validationf("%s[%d] must be string, got %T", key, i, item)
		}
		out = append(out, s)
	}
	return out, nil
}

func decodeRelationships(o map[string]any, key string) (map[string]domain.RelationType, error) {
	v, ok := o[key]
	if !ok {
		return nil, validationf("%s is required", key)
	}
	obj, ok := v.(map[string]tsparse.Value)
	if !ok {
		return nil, validationf("%s must be object, got %T", key, v)
	}
	return relationshipsFromObject(toAnyMap(obj))
}

func relationshipsFromObject(o map[string]any) (map[string]domain.RelationType, error) {
	out := make(map[string]domain.RelationType, len(o))
	for k, v := range o {
		s, ok := v.(string)
		if !ok {
			return nil, validationf("relationships[%s] must be string, got %T", k, v)
		}
		rt, err := decodeRelationType(s)
		if err != nil {
			return nil, err
		}
		out[k] = rt
	}
	return out, nil
}

// decodeStringOrFileRef returns a value-typed StringOrFileRef. Absent / nil
// keys yield the zero value (IsEmpty() == true).
func decodeStringOrFileRef(o map[string]any, key string) (domain.StringOrFileRef, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return domain.StringOrFileRef{}, nil
	}
	switch x := v.(type) {
	case string:
		return domain.StringOrFileRef{Value: x}, nil
	case map[string]tsparse.Value:
		// Only `{ file: "..." }` form is recognized.
		fv, ok := x["file"]
		if !ok {
			return domain.StringOrFileRef{}, validationf("%s object must have file field", key)
		}
		fs, ok := fv.(string)
		if !ok {
			return domain.StringOrFileRef{}, validationf("%s.file must be string, got %T", key, fv)
		}
		return domain.StringOrFileRef{File: fs}, nil
	}
	return domain.StringOrFileRef{}, validationf("%s must be string or { file: string }, got %T", key, v)
}

// optionalStringOrFileRef is the pointer variant: returns nil when the key is
// absent so callers can preserve "field unset" semantics for optional details.
func optionalStringOrFileRef(o map[string]any, key string) *domain.StringOrFileRef {
	v, ok := o[key]
	if !ok || v == nil {
		return nil
	}
	switch x := v.(type) {
	case string:
		return &domain.StringOrFileRef{Value: x}
	case map[string]tsparse.Value:
		if fv, ok := x["file"].(string); ok {
			return &domain.StringOrFileRef{File: fv}
		}
	}
	return nil
}

func getObject(o map[string]any, key string) (map[string]any, bool, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return nil, false, nil
	}
	obj, ok := v.(map[string]tsparse.Value)
	if !ok {
		return nil, false, validationf("%s must be object, got %T", key, v)
	}
	return toAnyMap(obj), true, nil
}

func getArray(o map[string]any, key string) ([]tsparse.Value, bool, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return nil, false, nil
	}
	arr, ok := v.([]tsparse.Value)
	if !ok {
		return nil, false, validationf("%s must be array, got %T", key, v)
	}
	return arr, true, nil
}

func getString(o map[string]any, key string) (string, bool, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return "", false, nil
	}
	s, ok := v.(string)
	if !ok {
		return "", false, validationf("%s must be string, got %T", key, v)
	}
	return s, true, nil
}

func getBool(o map[string]any, key string) (bool, bool, error) {
	v, ok := o[key]
	if !ok || v == nil {
		return false, false, nil
	}
	b, ok := v.(bool)
	if !ok {
		return false, false, validationf("%s must be bool, got %T", key, v)
	}
	return b, true, nil
}

// toAnyMap converts the parser's map[string]tsparse.Value to map[string]any so
// the rest of this package can use a single concrete map type without repeated
// type-assertion plumbing.
func toAnyMap(m map[string]tsparse.Value) map[string]any {
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
