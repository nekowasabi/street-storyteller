#!/usr/bin/env sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="${OUT_DIR:-$root/dist}"
mkdir -p "$out"

targets="${TARGETS:-linux/amd64 linux/arm64 darwin/amd64 darwin/arm64 windows/amd64}"
for target in $targets; do
  goos=${target%/*}
  goarch=${target#*/}
  ext=""
  if [ "$goos" = "windows" ]; then
    ext=".exe"
  fi
  name="storyteller_${goos}_${goarch}${ext}"
  echo "building $name"
  GOOS="$goos" GOARCH="$goarch" CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$out/$name" ./cmd/storyteller
done
