# LSP Validate Testing Patterns

## Test Structure
- File: tests/cli/lsp_validate_command_test.ts
- 11 test suites, 24 steps total
- Uses createTestContext() helper with stub presenter (info/error/success arrays)
- LspValidateCommand accepts deps: { loadEntities, listMarkdownFiles } for DI

## Key Test Patterns
- Temp dirs: `Deno.makeTempDir({ prefix: "storyteller_..." })` with try/finally cleanup
- Entity stubs: DetectableEntity[] with kind/id/name/displayNames/aliases
- Alias "勇者" produces ~0.8 confidence (medium, not low)
- High-confidence matches (confidence >= 0.9) are suppressed from diagnostics

## Common Pitfalls
- `deno test` directly lacks --allow-write; always use `deno task test`
- cmd.handle() is protected; tests must use cmd.execute()
- Stale .claude/worktrees/ blocks deno task test type-checking; cleanup with `git worktree remove --force`

## Regression
- Original 5 tests use `diagnostics: unknown[]` - backward compatible with type extensions
- computeConfidenceSummary tested with hardcoded DiagnosticOutput values
