#!/usr/bin/env bash
# Usage: scripts/release.sh <version_tag>   e.g. scripts/release.sh v0.1.0
#
# 1. Build cross-compiled storyteller binaries via scripts/build.sh
# 2. Archive each (os,arch) directory:
#    - linux/darwin: storyteller-<version>-<os>-<arch>.tar.gz
#    - windows:      storyteller-<version>-windows-amd64.zip
# 3. Emit dist/checksums.txt (sha256)
#
# Why: GitHub Release アセットを単一スクリプトで再現可能にする
#      （採用: 単純な tar/zip + sha256 / 棄却: goreleaser 依存追加 — まだ需要が低い）
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version_tag> (e.g. v0.1.0)" >&2
  exit 1
fi

VERSION="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"

rm -rf "${DIST}"
mkdir -p "${DIST}"

# Cross compile
OUT_DIR="${DIST}" bash "${ROOT}/scripts/build.sh"

cd "${DIST}"

# Tarball/zip per platform
for d in linux_amd64 linux_arm64 darwin_amd64 darwin_arm64; do
  if [ -d "$d" ]; then
    os="${d%_*}"
    arch="${d#*_}"
    asset="storyteller-${VERSION}-${os}-${arch}.tar.gz"
    echo "packaging $asset"
    tar -czf "$asset" "$d/storyteller"
  fi
done

if [ -d "windows_amd64" ]; then
  asset="storyteller-${VERSION}-windows-amd64.zip"
  echo "packaging $asset"
  if command -v zip >/dev/null 2>&1; then
    zip -q "$asset" "windows_amd64/storyteller.exe"
  else
    echo "WARN: zip command not found; skipping windows archive" >&2
  fi
fi

# Checksums
echo "writing checksums.txt"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 storyteller-${VERSION}-*.tar.gz storyteller-${VERSION}-*.zip 2>/dev/null \
    | sort > checksums.txt || true
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum storyteller-${VERSION}-*.tar.gz storyteller-${VERSION}-*.zip 2>/dev/null \
    | sort > checksums.txt || true
else
  echo "WARN: no sha256 tool found; checksums.txt is empty" >&2
  : > checksums.txt
fi

echo "Release artifacts:"
ls -1 "${DIST}" | grep -E "^storyteller-${VERSION}-|^checksums.txt$" || true
