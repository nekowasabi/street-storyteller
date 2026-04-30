#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Legacy term is allowed only in a narrow list while migration is in progress.
is_allowed_path() {
  local path="$1"
  case "$path" in
    docs/migration/plot-rename.md) return 0 ;;
    CHANGELOG.md) return 0 ;;
    PLAN.md) return 0 ;;
    plan/*.md) return 0 ;;
    .claude/skills/storyteller-writing/*) return 0 ;;
    .claude/skills/storyteller-writing/references/*) return 0 ;;
    .serena/memories/*.md) return 0 ;;
    internal/cli/modules/migrate/migrate.go) return 0 ;;
    internal/cli/modules/migrate/migrate_test.go) return 0 ;;
    internal/cli/modules/migrate/testdata/*) return 0 ;;
    *) return 1 ;;
  esac
}

found=0
legacy_lower='sub'"plot"
legacy_upper='Sub'"plot"
legacy_pattern="${legacy_lower}|${legacy_upper}"
matches="$(rg -n --no-heading --hidden --glob '!.git' -e "$legacy_pattern" . || true)"

if [[ -z "$matches" ]]; then
  echo "[legacy-term-guard] OK: no legacy term usage found"
  exit 0
fi

while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  # rg output format: path:line:content
  file="${line%%:*}"
  file="${file#./}"

  if is_allowed_path "$file"; then
    continue
  fi

  if [[ $found -eq 0 ]]; then
    echo "[legacy-term-guard] ERROR: forbidden legacy term found:"
  fi
  found=1
  echo "  $line"
done <<< "$matches"

if [[ $found -ne 0 ]]; then
  echo
  echo "[legacy-term-guard] Allowed paths:"
  echo "  - docs/migration/plot-rename.md"
  echo "  - CHANGELOG.md"
  echo "  - PLAN.md"
  echo "  - plan/*.md"
  echo "  - .claude/skills/storyteller-writing/*"
  echo "  - .claude/skills/storyteller-writing/references/*"
  echo "  - .serena/memories/*.md"
  echo "  - internal/cli/modules/migrate/migrate.go"
  echo "  - internal/cli/modules/migrate/migrate_test.go"
  echo "  - internal/cli/modules/migrate/testdata/*"
  exit 1
fi

echo "[legacy-term-guard] OK: only allowed legacy references found"
