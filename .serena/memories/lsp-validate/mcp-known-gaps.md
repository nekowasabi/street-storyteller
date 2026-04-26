# MCP lsp_validate Known Gaps (vs CLI)

Gap analysis from Process 50 (2026-04-21):

| Gap            | Detail                                                     | Resolution   |
| -------------- | ---------------------------------------------------------- | ------------ |
| No --strict    | MCP has no strict parameter                                | Future Issue |
| No confidence  | DiagnosticsGenerator drops confidence from PositionedMatch | Future Issue |
| No entityId    | Same root cause as confidence                              | Future Issue |
| No summary     | No ConfidenceSummary in MCP output                         | Future Issue |
| Line numbering | CLI is 1-based, MCP is 0-based (LSP standard)              | By design    |

Root cause: MCP delegates to DiagnosticsGenerator.generate() which produces
LSP-protocol-shaped diagnostics without confidence/entityId. CLI bypasses this
and maps PositionedMatch directly to richer DiagnosticOutput.

Fix options: (a) MCP switch to CLI's direct-detection approach, or (b) extend
DiagnosticsGenerator to optionally include confidence/entityId.
