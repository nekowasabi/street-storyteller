#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install.sh [--prefix DIR] [--force]

Options:
  --prefix DIR    Installation prefix (default: $HOME/.local)
  --force         Overwrite existing storyteller binary
  --help          Show this help message

This installer downloads or builds the storyteller CLI using deno compile.
EOF
}

PREFIX="${HOME}/.local"
FORCE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      PREFIX="$2"
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

BIN_DIR="${PREFIX}/bin"
mkdir -p "${BIN_DIR}"

echo "Installing storyteller to ${BIN_DIR}"
if [[ "${FORCE}" == "false" && -f "${BIN_DIR}/storyteller" ]]; then
  echo "storyteller already exists. Re-run with --force to overwrite." >&2
  exit 1
fi

if command -v deno >/dev/null 2>&1; then
  deno compile --allow-read --allow-write --output "${BIN_DIR}/storyteller" main.ts
else
  echo "Deno is required to build storyteller." >&2
  exit 1
fi

chmod +x "${BIN_DIR}/storyteller"
echo "storyteller installed successfully."
