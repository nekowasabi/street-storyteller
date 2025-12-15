# MCP API (Street Storyteller)

This document describes the MCP (Model Context Protocol) surface exposed by
`storyteller mcp start --stdio`.

## Start

```bash
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/story-project
```

## Tools

### `meta_check`

- Purpose: validate manuscript metadata generation feasibility.
- Args: `path?: string`, `dir?: string`, `recursive?: boolean`,
  `characters?: string`, `settings?: string`, `preset?: string`

### `meta_generate`

- Purpose: generate `.meta.ts` companion files from manuscripts.
- Args: `path?: string`, `dir?: string`, `recursive?: boolean`,
  `preview?: boolean`, `dryRun?: boolean`, `force?: boolean`,
  `update?: boolean`, `output?: string`, `characters?: string`,
  `settings?: string`, `preset?: string`

### `element_create`

- Purpose: create story elements (currently characters).
- Args: `type: "character"|"setting"`, `name: string`, `id?: string`,
  `role?: string`, `summary?: string`, `traits?: string[]`,
  `withDetails?: boolean`, `addDetails?: string`, `separateFiles?: string`,
  `force?: boolean`

### `view_browser`

- Purpose: visualize project as HTML (generate file or serve).
- Args: `path?: string`, `output?: string`, `serve?: boolean`, `port?: number`,
  `watch?: boolean`, `timeout?: number`, `dryRun?: boolean`

### `lsp_validate`

- Purpose: run LSP-style diagnostics on manuscripts.
- Args: `projectRoot?: string`, `path?: string`, `dir?: string`,
  `recursive?: boolean`
- Returns: JSON text (`Diagnostic[]` for single file, or `{path, diagnostics}[]`
  for directory)

### `lsp_find_references`

- Purpose: find entity references with positions.
- Args: `projectRoot?: string`, `path?: string`, `dir?: string`,
  `recursive?: boolean`, `characterName?: string`, `settingName?: string`
- Returns: JSON text (`ReferenceLocation[]`)

## Resources

Resources are served under the custom `storyteller://` scheme.

- `storyteller://project` → project analysis JSON
  (`{ characters, settings, manuscripts }`)
- `storyteller://characters` → character summaries JSON
- `storyteller://character/<id>` → single character summary JSON
- `storyteller://settings` → setting summaries JSON
- `storyteller://setting/<id>` → single setting summary JSON

## Prompts

### Creative

- `character_brainstorm` args: `role` (required), `genre` (optional)
- `plot_suggestion` args: `genre` (required), `logline` (optional)
- `scene_improvement` args: `scene` (required), `goal` (optional)

### Workflow

- `project_setup_wizard` args: `name` (required), `template` (optional)
- `chapter_review` args: `chapter` (required), `text` (optional)
- `consistency_fix` args: `issue` (required), `context` (optional)

---

_Last updated: 2025-12-15 (Phase 5)_
