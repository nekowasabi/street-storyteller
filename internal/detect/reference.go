package detect

import (
	"strings"
)

// DetectionRequest is the input contract for the Detect pipeline.
//
// URI is propagated into SourceLocation. Content is the raw manuscript body
// (frontmatter strip is the caller's responsibility for now). Catalog provides
// name/id resolution; if the concrete catalog also implements detailedCatalog,
// per-entity hints (pronouns / aliases / display names / exclude patterns)
// are pulled to refine MatchSource attribution and exclusion.
//
// Bindings carries the explicit FrontMatter binding by EntityKind. Each id
// listed produces a 1.0 candidate via SourceFrontMatter; ids not present in
// the catalog still emit a candidate but carry a "catalog_miss" warning.
type DetectionRequest struct {
	URI      string
	Content  string
	Catalog  EntityCatalog
	Bindings map[EntityKind][]string
}

// DetectedEntity is the deduped per-entity result of a single Detect call.
//
// Score is the highest-confidence value observed across all raw candidates
// for the same (Kind, ID); Source records the attribution that produced that
// score. Location points to the FIRST byte offset where the winning text was
// matched in the manuscript body (FrontMatter candidates carry a zero
// location). Warnings collects non-fatal anomalies, currently:
//   - "catalog_miss": a FrontMatter binding referenced an id absent from the catalog.
type DetectedEntity struct {
	Entity      EntityRef
	Source      MatchSource
	Score       float64
	Location    SourceLocation
	MatchedText string
	Warnings    []string
}

// Hints is the bag of per-entity detection metadata pulled from a catalog
// implementing detailedCatalog. The fields mirror TS reference_detector.ts
// (`displayNames`, `aliases`, `pronouns`, `detectionHints.excludePatterns`).
type Hints struct {
	Pronouns        []string
	DisplayNames    []string
	Aliases         []string
	ExcludePatterns []string
}

// detailedCatalog is an optional capability interface. Implemented as a
// local interface to avoid mutating the EntityCatalog contract owned by
// internal/detect/types.go (Wave-A3-pre invariant).
//
// Why: a local extension preserves the disjoint scope across parallel
// worktrees; the alternative (extending EntityCatalog) would force a shared
// edit and serialize the wave.
type detailedCatalog interface {
	DetectionHints(kind EntityKind, id string) (Hints, bool)
}

// confidence values mirror TS L319-345.
const (
	scoreName        = 1.0
	scoreDisplayName = 0.9
	scoreAlias       = 0.8
	scorePronoun     = 0.6
	scoreFrontMatter = 1.0
)

// candidate is the pre-dedup record produced by the body scan or the
// FrontMatter merge. It is private to the pipeline.
type candidate struct {
	entity     EntityRef
	source     MatchSource
	score      float64
	matched    string
	byteOffset int
	warnings   []string
}

// Detect runs the 4-stage pipeline:
//  1. candidate generation (body scan over Catalog.ListNames / hints)
//  2. exclude filter (detectionHints.ExcludePatterns)
//  3. dedup by (Kind, ID), keeping highest score; first byte offset wins location
//  4. FrontMatter merge (binding ids force score=1.0; unknown ids keep candidate with warning)
//
// Why this layout instead of "single pass scoring": the TS reference_detector
// builds candidates per-name and merges per-entity; mirroring that order keeps
// equivalence checks tractable when we later add a contract test.
func Detect(req DetectionRequest) []DetectedEntity {
	cands := []candidate{}

	// Phase 1: body candidate generation.
	if req.Catalog != nil && req.Content != "" {
		cands = append(cands, scanBody(req.Content, req.Catalog)...)
	}

	// Phase 2: exclude filter (skip candidates whose entity has an exclude
	// pattern that occurs anywhere in the body).
	if dc, ok := req.Catalog.(detailedCatalog); ok && len(cands) > 0 {
		cands = applyExcludes(cands, req.Content, dc)
	}

	// Phase 3 (intermediate): merge with FrontMatter bindings before dedup so
	// that a binding can boost the score / source for an entity also matched
	// in the body.
	cands = append(cands, fromBindings(req.Bindings, req.Catalog)...)

	// Phase 4: dedup.
	deduped := dedup(cands)

	// Why: PositionTable で UTF-16 char position に正規化。placeholder byteOffset は
	// LSP consumer (UTF-16 契約) と mismatch するため process-04 を待たず本実装に置換。
	pt := NewPositionTable(req.Content)

	out := make([]DetectedEntity, 0, len(deduped))
	for _, c := range deduped {
		start, err1 := pt.PositionAt(c.byteOffset)
		end, err2 := pt.PositionAt(c.byteOffset + len(c.matched))
		if err1 != nil || err2 != nil {
			// Why: rune/separator 境界 mismatch の candidate は silently skip。
			// types.go (warning slice の拡張) を触らない方針なので diagnostic 化は process-04 以降。
			continue
		}
		out = append(out, DetectedEntity{
			Entity: c.entity,
			Source: c.source,
			Score:  c.score,
			Location: SourceLocation{
				URI:   req.URI,
				Range: RangeUTF16{Start: start, End: end},
			},
			MatchedText: c.matched,
			Warnings:    c.warnings,
		})
	}
	return out
}

// scanBody enumerates every name registered in the catalog (across every
// EntityKind) and emits one candidate per occurrence. Source/score are
// determined first by detailedCatalog hints (pronoun/displayName/alias) and
// fall back to Catalog.FindByName for the canonical attribution.
func scanBody(body string, cat EntityCatalog) []candidate {
	dc, _ := cat.(detailedCatalog)
	out := []candidate{}

	kinds := []EntityKind{
		EntityCharacter, EntitySetting, EntityForeshadowing,
		EntityTimelineEvent, EntityPhase, EntityTimeline,
	}
	for _, kind := range kinds {
		for _, name := range cat.ListNames(kind) {
			if name == "" {
				continue
			}
			ref, source, ok := cat.FindByName(name)
			if !ok {
				continue
			}
			// If catalog only knows the entity by its primary name (returning
			// SourceName), use detailedCatalog hints to refine attribution.
			if dc != nil {
				if h, hok := dc.DetectionHints(ref.Kind, ref.ID); hok {
					source = classifySource(name, h, source)
				}
			}
			score := scoreFor(source)

			// All occurrences (TS countOccurrences pattern, L291-306).
			start := 0
			for {
				idx := strings.Index(body[start:], name)
				if idx == -1 {
					break
				}
				abs := start + idx
				out = append(out, candidate{
					entity:     ref,
					source:     source,
					score:      score,
					matched:    name,
					byteOffset: abs,
				})
				start = abs + len(name)
			}
		}
	}
	return out
}

// classifySource resolves the MatchSource by inspecting which bucket of
// hints the matched name belongs to. Order matches TS L319-333:
// name (1.0) > displayName (0.9) > alias (0.8) > pronoun (0.6).
//
// Why: catalog.FindByName may return SourceName uniformly when the catalog
// indexes by primary name only; classifying via hints ensures display/alias/
// pronoun retain their reduced confidence.
func classifySource(name string, h Hints, fallback MatchSource) MatchSource {
	for _, p := range h.Pronouns {
		if p == name {
			return SourcePronoun
		}
	}
	for _, a := range h.Aliases {
		if a == name {
			return SourceAlias
		}
	}
	for _, d := range h.DisplayNames {
		if d == name {
			return SourceDisplayName
		}
	}
	return fallback
}

func scoreFor(s MatchSource) float64 {
	switch s {
	case SourceName:
		return scoreName
	case SourceDisplayName:
		return scoreDisplayName
	case SourceAlias:
		return scoreAlias
	case SourcePronoun:
		return scorePronoun
	case SourceFrontMatter:
		return scoreFrontMatter
	default:
		return scoreDisplayName
	}
}

// applyExcludes drops candidates whose entity declares an excludePattern that
// is present in body. Matches TS L349-352 + later filter stage.
func applyExcludes(cands []candidate, body string, dc detailedCatalog) []candidate {
	kept := cands[:0]
	for _, c := range cands {
		h, ok := dc.DetectionHints(c.entity.Kind, c.entity.ID)
		if !ok {
			kept = append(kept, c)
			continue
		}
		excluded := false
		for _, ex := range h.ExcludePatterns {
			if ex != "" && strings.Contains(body, ex) {
				excluded = true
				break
			}
		}
		if !excluded {
			kept = append(kept, c)
		}
	}
	return kept
}

// fromBindings emits a SourceFrontMatter candidate per (kind, id) pair in
// req.Bindings. Catalog miss is downgraded to a warning rather than an error
// (caller decides how to surface it).
func fromBindings(bindings map[EntityKind][]string, cat EntityCatalog) []candidate {
	out := []candidate{}
	for kind, ids := range bindings {
		for _, id := range ids {
			ref := EntityRef{Kind: kind, ID: id}
			warnings := []string(nil)
			if cat != nil {
				if _, ok := cat.FindByID(kind, id); !ok {
					warnings = []string{"catalog_miss"}
				}
			}
			out = append(out, candidate{
				entity:     ref,
				source:     SourceFrontMatter,
				score:      scoreFrontMatter,
				matched:    "",
				byteOffset: 0,
				warnings:   warnings,
			})
		}
	}
	return out
}

// dedup merges candidates with the same (Kind, ID). The retained record
// keeps the highest score and the FIRST byte offset observed (mirrors TS
// mergeDetections L246-279, where occurrences accumulate but location of the
// first hit is preserved). Warnings union across duplicates.
func dedup(cands []candidate) []candidate {
	type key struct {
		kind EntityKind
		id   string
	}
	idx := map[key]int{}
	out := []candidate{}
	for _, c := range cands {
		k := key{c.entity.Kind, c.entity.ID}
		if pos, ok := idx[k]; ok {
			cur := out[pos]
			// keep highest score; on tie prefer existing source for stability
			if c.score > cur.score {
				cur.score = c.score
				cur.source = c.source
			}
			// preserve first non-empty matched text + offset
			if cur.matched == "" && c.matched != "" {
				cur.matched = c.matched
				cur.byteOffset = c.byteOffset
			}
			cur.warnings = mergeWarnings(cur.warnings, c.warnings)
			out[pos] = cur
			continue
		}
		idx[k] = len(out)
		out = append(out, c)
	}
	return out
}

func mergeWarnings(a, b []string) []string {
	if len(b) == 0 {
		return a
	}
	seen := map[string]bool{}
	out := []string{}
	for _, w := range a {
		if !seen[w] {
			seen[w] = true
			out = append(out, w)
		}
	}
	for _, w := range b {
		if !seen[w] {
			seen[w] = true
			out = append(out, w)
		}
	}
	return out
}
