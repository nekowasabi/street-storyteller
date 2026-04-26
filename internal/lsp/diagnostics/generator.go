// Package diagnostics aggregates diagnostic results from multiple sources
// (storyteller core, textlint, future Vale) for textDocument/publishDiagnostics.
//
// Why: a small DiagnosticSource interface keeps each source self-contained
// and lets the LSP server compose them without conditional plumbing.
package diagnostics

import (
	"context"
	"fmt"

	"github.com/takets/street-storyteller/internal/detect"
	"github.com/takets/street-storyteller/internal/lsp/protocol"
)

// LSP diagnostic severities (mirrors protocol.Diagnostic.Severity codes).
const (
	severityError   = 1
	severityWarning = 2
)

// Confidence-band thresholds that map detect Score → LSP Severity.
//
// Why these exact bands: detect emits scores at fixed levels (1.0 name,
// 0.9 displayName, 0.8 alias, 0.6 pronoun). Splitting at 0.7 / 0.85 keeps
// alias=Warning and pronoun=Error while leaving name/displayName silent.
const (
	thresholdLow  = 0.7  // < this → Error
	thresholdHigh = 0.85 // < this (and >= thresholdLow) → Warning; >= this → no diagnostic
)

// DiagnosticSource is implemented by any subsystem that can produce
// diagnostics for a (uri, content) pair.
type DiagnosticSource interface {
	Name() string
	Generate(ctx context.Context, uri, content string) ([]protocol.Diagnostic, error)
}

// StorytellerSource produces diagnostics from the detect engine, flagging
// low-confidence references so the writer can disambiguate them.
type StorytellerSource struct {
	Catalog  detect.EntityCatalog
	Bindings map[detect.EntityKind][]string
}

// Name implements DiagnosticSource.
func (s *StorytellerSource) Name() string { return "storyteller" }

// Generate runs detect and converts low-confidence hits into diagnostics.
func (s *StorytellerSource) Generate(_ context.Context, uri, content string) ([]protocol.Diagnostic, error) {
	if s.Catalog == nil {
		return nil, nil
	}
	results := detect.Detect(detect.DetectionRequest{
		URI:      uri,
		Content:  content,
		Catalog:  s.Catalog,
		Bindings: s.Bindings,
	})

	out := make([]protocol.Diagnostic, 0, len(results))
	for _, r := range results {
		sev := severityFor(r.Score)
		if sev == 0 {
			continue
		}
		out = append(out, protocol.Diagnostic{
			Range:    toProtocolRange(r.Location.Range),
			Severity: sev,
			Code:     string(r.Entity.Kind),
			Source:   "storyteller",
			Message:  messageFor(sev, r.MatchedText, r.Score),
		})
	}
	return out, nil
}

// severityFor maps a detect score to an LSP severity. Returns 0 for "no
// diagnostic" so callers can skip without an extra bool.
func severityFor(score float64) int {
	switch {
	case score < thresholdLow:
		return severityError
	case score < thresholdHigh:
		return severityWarning
	default:
		return 0
	}
}

func messageFor(sev int, matched string, score float64) string {
	if sev == severityError {
		return fmt.Sprintf("低信頼度の参照: %q (score=%.2f)", matched, score)
	}
	return fmt.Sprintf("曖昧な参照: %q", matched)
}

func toProtocolRange(r detect.RangeUTF16) protocol.Range {
	return protocol.Range{
		Start: protocol.Position{
			Line:      uint32(r.Start.Line),
			Character: uint32(r.Start.Character),
		},
		End: protocol.Position{
			Line:      uint32(r.End.Line),
			Character: uint32(r.End.Character),
		},
	}
}

// Aggregator runs every registered DiagnosticSource and concatenates results.
//
// Why fail-fast: the LSP server publishes a single diagnostics array per URI;
// surfacing a partial set after one source errors masks the failure. Caller
// can recover by removing or fixing the offending source.
type Aggregator struct {
	Sources []DiagnosticSource
}

// Generate runs all sources sequentially and returns the merged slice. The
// first error short-circuits.
func (a *Aggregator) Generate(ctx context.Context, uri, content string) ([]protocol.Diagnostic, error) {
	out := []protocol.Diagnostic{}
	for _, src := range a.Sources {
		diags, err := src.Generate(ctx, uri, content)
		if err != nil {
			return nil, fmt.Errorf("diagnostic source %q: %w", src.Name(), err)
		}
		out = append(out, diags...)
	}
	return out, nil
}
