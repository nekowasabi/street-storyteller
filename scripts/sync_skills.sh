#!/usr/bin/env bash
# Why: skills/ をリポジトリ正本、internal/cli/modules/generate/assets/skills/ を
# go:embed 用ミラーとし、両者を同期する。手作業ズレを防止するため CI で
# `scripts/sync_skills.sh --check` を実行することを推奨。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/skills"
DST="${ROOT}/internal/cli/modules/generate/assets/skills"

mode="${1:-sync}"

if [ "${mode}" = "--check" ]; then
  diff -r "${SRC}" "${DST}" >/dev/null
  exit $?
fi

rm -rf "${DST}"
mkdir -p "${DST}"
cp -R "${SRC}/." "${DST}/"
echo "synced: ${SRC} -> ${DST}"
