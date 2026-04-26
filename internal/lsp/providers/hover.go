// Package providers implements stateless LSP feature providers
// (textDocument/hover, textDocument/definition) on top of the detect engine.
//
// Why: providers depend only on detect + protocol + a caller-supplied
// EntityLookup/EntityLocator, keeping import direction one-way and avoiding
// any pull on internal/cli or internal/mcp.
package providers

import (
	"context"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// DocumentSnapshot is the minimal view of an open document needed by
// providers. The LSP server (textsync) is expected to implement this.
type DocumentSnapshot interface {
	URI() string
	Content() string
}

// EntityInfo is the resolved presentation payload for a single entity.
// It is intentionally narrow so that callers can map any underlying domain
// type (Character / Setting / Foreshadowing ...) into a uniform shape.
type EntityInfo struct {
	Name    string
	Kind    string
	Summary string
}

// EntityLookup resolves an EntityRef into displayable detail for hover.
type EntityLookup interface {
	Lookup(ref detect.EntityRef) (EntityInfo, bool)
}

// Hover implements textDocument/hover.
//
// It runs the detect pipeline over the snapshot content, picks the first
// detected entity whose location range covers pos (UTF-16 half-open
// interval, single line only), and renders a Markdown payload via lookup.
//
// Returns (nil, nil) when no entity is at pos or when lookup fails — the
// LSP-level null result.
//
// Why: by returning the first match in detect's natural order we avoid
// re-sorting (Detect already dedups per (Kind, ID) keeping the highest
// score). Multi-line spans are out of scope; manuscript references in
// scope so far are single-token name matches.
func Hover(
	_ context.Context,
	doc DocumentSnapshot,
	pos protocol.Position,
	catalog detect.EntityCatalog,
	lookup EntityLookup,
) (*protocol.HoverResult, error) {
	if doc == nil || catalog == nil || lookup == nil {
		return nil, nil
	}

	detected := detect.Detect(detect.DetectionRequest{
		URI:     doc.URI(),
		Content: doc.Content(),
		Catalog: catalog,
	})

	for _, d := range detected {
		if !rangeContains(d.Location.Range, pos) {
			continue
		}
		info, ok := lookup.Lookup(d.Entity)
		if !ok {
			continue
		}
		return &protocol.HoverResult{
			Contents: protocol.MarkupContent{
				Kind:  "markdown",
				Value: "**" + info.Name + "** (" + info.Kind + ")\n\n" + info.Summary,
			},
		}, nil
	}
	return nil, nil
}

// rangeContains reports whether pos lies in [r.Start, r.End) on the same
// line. Multi-line spans are treated as no-match (current detect emits
// single-line ranges only).
func rangeContains(r detect.RangeUTF16, pos protocol.Position) bool {
	if uint32(r.Start.Line) != pos.Line {
		return false
	}
	if uint32(r.End.Line) != pos.Line {
		return false
	}
	return uint32(r.Start.Character) <= pos.Character && pos.Character < uint32(r.End.Character)
}
