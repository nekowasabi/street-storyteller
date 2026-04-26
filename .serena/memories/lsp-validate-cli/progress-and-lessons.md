# LSP Validate CLI Implementation Lessons (Issue #12)

## Completed Processes (5/17)

- P1: listMarkdownFiles shared utils (src/lsp/utils/markdown_files.ts)
- P2: DiagnosticsGenerator.detectAll()
  (src/lsp/diagnostics/diagnostics_generator.ts)
- P3: DiagnosticOutput type extension (confidence?, entityId?)
- P4: --dir/--recursive flags (src/cli/modules/lsp/validate.ts)
- P5: High/Medium/Low summary aggregation (ConfidenceSummary,
  computeConfidenceSummary)

## Key Architecture Decisions

- listMarkdownFiles import: MUST use `@storyteller/lsp/utils/markdown_files.ts`,
  NOT `@storyteller/mcp/tools/lsp_shared.ts`
  - MCP side is maintained separately for gradual unification
- generateDiagnostics() uses PositionedDetector.detectWithPositions() directly
  (not DiagnosticsGenerator.generate())
  - Reason: LSP Diagnostic type doesn't propagate confidence/id
  - confidence >= 0.9: skip (high confidence, no diagnostic needed)
  - confidence < 0.7: "warning", 0.7-0.9: "hint"
- ConfidenceSummary thresholds: High >= 0.85, Medium >= 0.50, Low < 0.50

## Critical Lessons

1. **Sequential DAG + worktree conflict**: When P4 and P5 both modify
   validate.ts, and P5's worktree is based on the pre-P4 commit, merging causes
   conflicts. Solution: merge P4 into main BEFORE spawning P5's worktree.
2. **DI pattern for testability**: LspValidateDependencies injects
   listMarkdownFiles, allowing test stubs without file system access.
3. **Micro-exec partial mode**: User approved executing with actual subtask
   count (not minimum 10) for small task sets.

## Test Structure

- tests/cli/lsp_validate_command_test.ts: 10 tests (22 steps) covering P3-P5
- tests/lsp/utils/markdown_files_test.ts: 7 tests
- tests/lsp/diagnostics/diagnostics_generator_test.ts: 6 tests (8 steps)
- Deno permissions required: --allow-read --allow-write --allow-run --allow-env
  --allow-net

## Remaining DAG

`6→{10,11,12,13,14}→50→{100,101}→{200,201}→300`
