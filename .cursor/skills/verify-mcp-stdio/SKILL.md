---
name: verify-mcp-stdio
description: Checks that storyteller mcp start --stdio stays up while stdin is open and still runs a tools/call written immediately after initialize. Use when changing MCP stdio lifetime, protocol.Read, or Server.Run.
---

# Verify the MCP stdio session

Use this when a change touches `Command.Handle` in `internal/cli/modules/mcp/mcp.go`, `Server.Run` in `internal/mcp/server/server.go`, or `Read` / `Write` in `internal/mcp/protocol/jsonrpc.go`.

## Properties

The session stays up while stdin is open and the caller has not cancelled. If this breaks, an MCP client loses the server before it can call a tool.

A burst of `initialize` and `tools/call` written before any read is both dispatched before a clean EOF exit. If this breaks, `manuscript_binding` never runs and the process exits after the initialize response.

A `Content-Length` header is a parse error. Do not add a compatibility reader. PR 23 replaced that framing with one JSON object per line.

## What the model covers

`MCPStdio.tla` is the reader loop in `Server.Run` and the absence of an idle timer in `Handle`. One step is one of: the client writes both messages, `protocol.Read` returns one message, the client closes stdin, the buffer drains to EOF, the caller cancels, or the removed two-second timer fires.

`Behavior = "shared"` is the current loop: one `bufio.Reader` for every `Read`. `Behavior = "fresh"` builds a new reader per message and drops bytes already buffered. `Behavior = "timeout"` exits while stdin is still open.

Bounds: at most two messages. The model does not parse JSON, write manuscripts, or close a real file descriptor. It does not cover macOS. A pass is a pass of this model, not of every MCP client.

## How to run

Go tests, from the repo root:

```sh
go test ./internal/cli/modules/mcp/ ./internal/mcp/server/ ./internal/mcp/protocol/ -count=1
```

`TestMCP_StartStdioBackToBackManuscriptBinding` is the burst. `TestMCP_StartStdioStaysOpenUntilEOF` is the idle stdin. `TestRead_RejectsNonJSONLine` keeps the `Content-Length` line as an error. `TestServer_CancelReleasesInput` and `TestServer_WriteFailureReleasesInput` check that `Run` stops reading on the way out.

Formal check: read `/statechart` and run it on `MCPStdio.tla` in this directory. Pass `MCPStdio.cfg` and `view.mjs`. All three invariants and deadlock must hold. Then run the same spec with `MCPStdioFresh.cfg`. `BufferedSecondMessageDispatched` must fail, and the shortest path must be: both messages are written, one read drops the second, stdin closes. Then run `MCPStdioTimeout.cfg`. `SessionHoldsWhileInputOpen` must fail on the two-second timer while stdin is still open. Read each result with `/statechart`. Do not weaken an invariant to make `fresh` or `timeout` pass.

Charts from the last run are in `charts/shared`, `charts/fresh`, and `charts/timeout`. Regenerate them when the spec or the view changes. The view hides the `Done` stutter. It does not hide the second read or either bug path.

## When it fails

A Go failure of the burst test means `Run` is not reusing one `*bufio.Reader`. Moving `bufio.NewReader` inside the read loop makes `TestMCP_StartStdioBackToBackManuscriptBinding` fail with `back-to-back initialize and tools/call did not both complete`. That is the issue 19 comment, not a modeling error.

A shared-model failure of `SessionHoldsWhileInputOpen` means some step exits while stdin is open and the caller has not cancelled. Match that step to `Handle` or `Run` before changing the spec.

A shared-model failure of `BufferedSecondMessageDispatched` means a clean EOF can happen after the burst with fewer than two deliveries. That is the fresh-reader bug. A `fresh` or `timeout` failure is the guard working.

If the Go tests pass and the shared model fails, the model has drifted. Fix the model so its steps still match `Run`, then recheck. If the shared model passes and a Go test fails, the model left out a real step. Add that step. Do not delete the test.

## Coverage record

Checked against commit `SYNC_COMMIT`. Move that commit forward only after you confirm the spec still describes `Server.Run` and `Command.Handle` at the new commit.

Covered:

- `internal/cli/modules/mcp/mcp.go` `Command.Handle`
- `internal/mcp/server/server.go` `Server.Run`
- `internal/mcp/protocol/jsonrpc.go` `Read` and `Write`
- `internal/cli/modules/mcp/mcp_test.go` stdio session tests
- `internal/mcp/server/stdio_wire_test.go`
- `internal/mcp/server/cancel_test.go`
- `internal/mcp/protocol/jsonrpc_test.go`

After a change to those files that did not rerun this skill, use `/maintain-formal-verification-skill`.
