# LSP Validate Architecture Decisions

## Dual Diagnostic Pipeline
- **CLI path**: PositionedDetector.detectWithPositions() → DiagnosticOutput (confidence, entityId, summary)
- **MCP path**: DiagnosticsGenerator.generate() → LSP Diagnostic (range-based, no confidence/entityId)
- These are intentionally different. CLI needs richer output for CI/summarization. MCP follows LSP protocol.
- Unification planned for future Issue.

## Confidence Thresholds
- HIGH_THRESHOLD = 0.9 (name/displayName matches suppressed)
- MEDIUM_THRESHOLD = 0.7
- LOW = < 0.7
- These align with DiagnosticsGenerator's existing 0.9/0.7 thresholds.
- --strict triggers on medium+low (not low alone) because PositionedDetector minimum confidence is 0.8 (aliases).

## Key Types
- DiagnosticOutput: Extended type with optional confidence, entityId fields (backward-compatible)
- ConfidenceSummary: { high, medium, low, total }
- ValidationResult: { filePath, diagnostics, summary }

## Constraints
- cli.ts:93-98 hardcodes Deno.exit(1) - no differentiated exit codes
- listMarkdownFiles duplicated (CLI copy at src/lsp/utils/markdown_files.ts, MCP original at src/mcp/tools/lsp_shared.ts)
