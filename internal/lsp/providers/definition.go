package providers

import (
	"context"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// EntityLocator resolves an EntityRef into the source-code Location of its
// definition (TypeScript file under src/characters etc.).
type EntityLocator interface {
	Locate(ref detect.EntityRef) (protocol.Location, bool)
}

// Definition implements textDocument/definition.
//
// Runs detect over the snapshot, collects every entity whose location range
// covers pos (single-line UTF-16 half-open), then asks locator for each
// definition Location. Returns an empty slice when nothing matches.
//
// Why: returns []Location (DefinitionResult) instead of *Location so that
// future overloads (one alias mapping to multiple defs) need no signature
// change.
func Definition(
	_ context.Context,
	doc DocumentSnapshot,
	pos protocol.Position,
	catalog detect.EntityCatalog,
	locator EntityLocator,
) (protocol.DefinitionResult, error) {
	if doc == nil || catalog == nil || locator == nil {
		return protocol.DefinitionResult{}, nil
	}

	detected := detect.Detect(detect.DetectionRequest{
		URI:     doc.URI(),
		Content: doc.Content(),
		Catalog: catalog,
	})

	out := protocol.DefinitionResult{}
	for _, d := range detected {
		if !rangeContains(d.Location.Range, pos) {
			continue
		}
		loc, ok := locator.Locate(d.Entity)
		if !ok {
			continue
		}
		out = append(out, loc)
	}
	return out, nil
}
