# Changelog

## Unreleased

### Breaking Changes

- Renamed the story line entity from the legacy subplot terminology to Plot.
- The secondary plot type literal is now `sub`; `main`, `parallel`, and `background` are unchanged.
- CLI, MCP tools, resource URIs, generated project paths, and sample fixtures now use `plot` / `plots`.

### Migration

- Added `storyteller migrate plot-rename`.
- Run `storyteller migrate plot-rename --dry-run` first, review the planned changes, then run `--apply` from a clean git working tree.
- See [docs/migration/plot-rename.md](docs/migration/plot-rename.md).
