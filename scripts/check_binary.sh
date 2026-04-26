#!/usr/bin/env sh
set -eu

bin="${1:-./dist/linux_amd64/storyteller}"
max_bytes=$((50 * 1024 * 1024))

if [ ! -x "$bin" ]; then
  echo "binary is not executable: $bin" >&2
  exit 1
fi

size=$(wc -c < "$bin" | tr -d ' ')
if [ "$size" -gt "$max_bytes" ]; then
  echo "binary too large: $size bytes" >&2
  exit 1
fi

"$bin" version >/dev/null
echo "ok $bin $size"
