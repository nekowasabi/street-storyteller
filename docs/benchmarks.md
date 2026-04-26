# Performance Benchmarks (Process 100)

This document records the performance gates introduced by the Go full-port
([PLAN.md](../PLAN.md), Process 100) and the most recent measurements taken
against the `storyteller` Go binary.

## Goals

The Go port was justified by two performance targets vs. the prior Deno
implementation:

| Indicator | Prior (Deno) | Target (Go) | Why |
|-----------|--------------|-------------|-----|
| CLI command latency | 100–300 ms | **< 100 ms** | Interactive use of `storyteller meta check`, `view`, `element`, etc. |
| LSP cold start (`initialize` roundtrip) | 3–5 s | **< 2 s** | Editor-perceivable startup when opening a manuscript |

## Methodology

Two scripts under `scripts/bench/` exercise the targets. Both are intentionally
small, dependency-free (only Go + Bash + GNU coreutils), and produce TSV that
is easy to diff in CI logs.

### CLI (`scripts/bench/bench_cli.sh`)

* Spawns the compiled binary 10 times per command (after one warmup).
* Times each invocation with `date +%s%N` (nanosecond clock; `/usr/bin/time -f %e` was rejected because its 10ms granularity rounds sub-millisecond runs to `0.00`).
* Computes mean / median / p95 in milliseconds.
* Targets:
  * `version` — `storyteller version`
  * `help` — `storyteller help` (prints registry usage)
  * `meta_check` — `storyteller meta check --path samples/cinderella` (exercises tsparse against a real authoring sample)
  * `view_help` — `storyteller view --help`
* Exits non-zero if any mean exceeds `TARGET_MS` (default `100`).

### LSP (`scripts/bench/bench_lsp.sh` → `scripts/bench/lsp_client.go`)

* The shell wrapper invokes a small Go helper.
* The helper, per run:
  1. `exec.Command(bin, "lsp", "start", "--stdio")` and starts the process.
  2. Sends an LSP-framed `initialize` request (Content-Length header + JSON body) to the child's stdin.
  3. Reads the child's stdout until the matching response (`id == 1`) arrives.
  4. Records elapsed wall-clock from `cmd.Start()` to response receipt.
  5. Kills the child to terminate the run.
* 10 measurement runs after one warmup.
* Targets `< 2000 ms` mean by default; configurable via `--target`.

> Why measure spawn → initialize roundtrip rather than the registered handler
> alone? That roundtrip is the user-observable cold start (binary load +
> registration + first JSON-RPC exchange). Anything cheaper is invisible to
> editors; anything more expensive is the gate we care about.

## Environment

| Field | Value |
|-------|-------|
| Date | 2026-04-27 |
| OS | Linux 6.6.114.1-microsoft-standard-WSL2 (x86_64, WSL2 on Windows) |
| CPU | 13th Gen Intel Core i5-13600K (20 logical CPUs) |
| Memory | 31 GiB total |
| Go toolchain | go1.26.0 linux/amd64 |
| Binary | `dist/storyteller`, built via `go build -trimpath -ldflags="-s -w" ./cmd/storyteller` (~3.3 MB) |

Filesystem and CPU governor are not pinned; results below should be treated as
indicative for a developer workstation, not a release SLA. CI re-runs on
`ubuntu-latest` are expected to show somewhat higher absolute numbers but
remain orders of magnitude below the targets.

## Results

CLI (`scripts/bench/bench_cli.sh`, 10 runs):

| Command | Target | Mean (ms) | Median (ms) | p95 (ms) | Status |
|---------|--------|-----------|-------------|----------|--------|
| `storyteller version` | < 100 ms | 1.8 | 2.0 | 3 | PASS |
| `storyteller help` | < 100 ms | 1.7 | 2.0 | 2 | PASS |
| `storyteller meta check --path samples/cinderella` | < 100 ms | 1.9 | 1.5 | 4 | PASS |
| `storyteller view --help` | < 100 ms | 1.6 | 1.5 | 3 | PASS |

LSP (`scripts/bench/bench_lsp.sh`, 10 runs, initialize roundtrip):

| Indicator | Target | Mean (ms) | Median (ms) | p95 (ms) | Status |
|-----------|--------|-----------|-------------|----------|--------|
| `storyteller lsp start --stdio` initialize | < 2000 ms | 1.0 | 1 | 1 | PASS |

Both gates pass with two orders of magnitude headroom on the measurement
workstation. The Deno baseline (`100–300 ms` for CLI, `3–5 s` for LSP) is not
re-measured here; reproducing it would require checking out the
`pre-ts-retire` tag and reinstalling Deno toolchain — out of scope for this
gate.

## Reproducing

```bash
# 1. Build the Go binary
go build -trimpath -ldflags="-s -w" -o dist/storyteller ./cmd/storyteller

# 2. CLI bench
bash scripts/bench/bench_cli.sh

# 3. LSP bench (uses `go run` for the helper)
bash scripts/bench/bench_lsp.sh
```

Environment overrides:

| Variable | Default | Effect |
|----------|---------|--------|
| `STORYTELLER_BIN` | `dist/storyteller` | Binary under test |
| `RUNS` | `10` | Measurement runs per target |
| `TARGET_MS` | `100` (CLI) / `2000` (LSP) | Pass/fail threshold |
| `SAMPLE_PROJECT` | `samples/cinderella` | Project used by `meta_check` target |
| `FORMAT` | `tsv` | `tsv` or `json` (CLI bench only) |

## Maintenance

* When a new high-traffic CLI subcommand ships, add it to `TARGETS` in
  `bench_cli.sh` rather than as a separate script.
* The LSP helper currently measures only `initialize`. If steady-state latency
  becomes a concern (e.g. `textDocument/diagnostic`), extend `lsp_client.go`
  with additional measured roundtrips rather than spawning new helpers.
* CI integration is intentionally manual (`workflow_dispatch`); the absolute
  numbers fluctuate too much on shared runners to make per-PR gating useful.
  See `.github/workflows/ci.yml` for the dispatchable bench job.
