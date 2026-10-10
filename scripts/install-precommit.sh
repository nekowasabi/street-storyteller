#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install-precommit.sh [--dir DIR] [--force]

Options:
  --dir DIR        Manuscripts directory to check (default: manuscripts)
  --force          Overwrite existing .git/hooks/pre-commit
  --help           Show this help message

Installs a Git pre-commit hook that runs:
  storyteller meta check --path <DIR>
EOF
}

DIR="manuscripts"
FORCE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      DIR="$2"
      shift 2
      ;;
    --force)
      FORCE="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d ".git" ]]; then
  echo "Not a git repository (missing .git directory)." >&2
  exit 1
fi

HOOK_PATH=".git/hooks/pre-commit"
mkdir -p ".git/hooks"

if [[ "${FORCE}" == "false" && -f "${HOOK_PATH}" ]]; then
  echo "${HOOK_PATH} already exists. Re-run with --force to overwrite." >&2
  exit 1
fi

cat > "${HOOK_PATH}" <<EOF
#!/usr/bin/env bash
set -euo pipefail

if ! command -v storyteller >/dev/null 2>&1; then
  echo "storyteller is required to run meta checks (make install)." >&2
  exit 1
fi

storyteller meta check --path "${DIR}"
EOF

chmod +x "${HOOK_PATH}"
echo "Installed pre-commit hook: ${HOOK_PATH}"

