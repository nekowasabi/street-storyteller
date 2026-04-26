#!/usr/bin/env bash
# Bench: LSP startup latency.
# Why: Process 100 quality gate — verify `storyteller lsp start --stdio` is
# usable in <2s. Wraps scripts/bench/lsp_client.go which spawns the LSP and
# measures the initialize JSON-RPC roundtrip.

set -eu

ROOT="$(cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT"

BIN="${STORYTELLER_BIN:-$ROOT/dist/storyteller}"
RUNS="${RUNS:-10}"
TARGET_MS="${TARGET_MS:-2000}"

if [ ! -x "$BIN" ]; then
  echo "binary not found: $BIN" >&2
  echo "build it first: go build -trimpath -ldflags='-s -w' -o dist/storyteller ./cmd/storyteller" >&2
  exit 2
fi

exec go run "$ROOT/scripts/bench/lsp_client.go" \
  --bin "$BIN" \
  --runs "$RUNS" \
  --target "$TARGET_MS"
