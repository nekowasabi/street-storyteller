// Package entity reads single-entity TS source files (`export const NAME = {...};`)
// and maps the raw object literal into the corresponding domain struct
// (Character, Setting, Foreshadowing, Timeline, Subplot, CharacterPhase).
//
// Why: storyteller projects ship entity definitions as TypeScript const literals.
// Migrating to Go requires a typed loader so transports (CLI / LSP / MCP) can
// rely on `domain.*` structs rather than touching `tsparse.Value` (map[string]any)
// at every callsite. The conversion is deliberately one-shot per file: cross-entity
// references stay as plain string IDs and are resolved by a higher-level store.
//
// Why: Unknown fields are silently ignored to maintain forward compatibility with
// new TS schema additions. Unknown enum values, in contrast, return a Validation
// error — silently dropping them would corrupt narrative semantics.
package entity
