# Test Cleanup List

Process 13 keeps Go unit tests and golden tests as the default feedback loop.
Legacy TypeScript E2E suites under `tests/cli_*`, `tests/lsp_*`, `tests/mcp_*`,
and `tests/rag_*` are retired from CI unless a specific regression requires a
focused replacement.

## Baseline

| Suite                        | Decision       | Replacement                   |
| ---------------------------- | -------------- | ----------------------------- |
| Go `go test ./...`           | keep           | primary gate                  |
| cmd/storyteller golden tests | keep           | CLI regression coverage       |
| Deno authoring tests         | keep minimal   | `deno task test:authoring`    |
| Legacy TS E2E                | remove from CI | targeted Go unit/golden tests |

## Policy

Add E2E tests only for behavior that cannot be covered by a unit, golden, or
narrow integration test, such as installer behavior or measured startup
performance.
