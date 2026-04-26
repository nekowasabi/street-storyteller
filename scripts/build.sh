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
  dir="$out/${goos}_${goarch}"
  mkdir -p "$dir"
  name="storyteller${ext}"
  echo "building ${goos}_${goarch}/$name"
  GOOS="$goos" GOARCH="$goarch" CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$dir/$name" ./cmd/storyteller
done
