// Package store holds an in-memory index of loaded entities (characters,
// settings, foreshadowings, timelines, plots, character phases) so that
// transports (CLI / LSP / MCP) can resolve them by ID or by name without
// re-walking the manifest each time.
package store
