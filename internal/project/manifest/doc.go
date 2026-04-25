// Package manifest loads `.storyteller.json` (the project manifest) and
// resolves its declared paths. It is the single source of truth for "where
// does this project keep its entities" so transports (CLI, MCP, LSP) need not
// each re-implement project layout discovery.
package manifest
