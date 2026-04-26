#!/usr/bin/env bash
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/nekowasabi/street-storyteller/main/scripts/install.sh | sh
#   curl -fsSL .../install.sh | sh -s -- --prefix /usr/local/bin
#   curl -fsSL .../install.sh | sh -s -- --version v0.1.0
#
# Downloads a prebuilt storyteller release binary from GitHub Releases for the
# current OS/ARCH and installs it under --prefix (default: $HOME/.local/bin).
#
# Why: Process 50 で Deno ランタイム不要化の最終ゴールを達成する。
#      旧 install.sh は手元で deno compile していたが、Go 製単一バイナリの
#      リリース運用へ切り替える（採用: GitHub Releases asset / 棄却: deno compile）。
set -euo pipefail

REPO="nekowasabi/street-storyteller"
PREFIX=""
VERSION=""
FORCE="false"

usage() {
  cat <<'EOF'
Usage: install.sh [--prefix DIR] [--version vX.Y.Z] [--force]

Options:
  --prefix DIR        Install directory (default: $HOME/.local/bin)
  --version vX.Y.Z    Specific release tag to install (default: latest)
  --force             Overwrite an existing storyteller binary
  --help              Show this help message
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix)
      PREFIX="$2"; shift 2 ;;
    --version)
      VERSION="$2"; shift 2 ;;
    --force)
      FORCE="true"; shift ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage; exit 1 ;;
  esac
done

# OS detection
uname_s="$(uname -s)"
case "$uname_s" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $uname_s" >&2
    echo "storyteller install.sh supports linux and darwin only. Use Manual download for others." >&2
    exit 1 ;;
esac

# ARCH detection
uname_m="$(uname -m)"
case "$uname_m" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $uname_m" >&2
    exit 1 ;;
esac

# Default prefix
if [ -z "$PREFIX" ]; then
  PREFIX="${HOME}/.local/bin"
fi
mkdir -p "$PREFIX"

# Resolve version (latest if unset)
if [ -z "$VERSION" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required" >&2; exit 1
  fi
  VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -E '"tag_name"' \
    | head -n1 \
    | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    echo "Failed to resolve latest release version from GitHub API." >&2
    exit 1
  fi
fi

ASSET="storyteller-${VERSION}-${OS}-${ARCH}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"

TARGET="${PREFIX}/storyteller"
if [ "$FORCE" = "false" ] && [ -f "$TARGET" ]; then
  echo "storyteller already exists at $TARGET. Re-run with --force to overwrite." >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "Downloading $URL"
if ! curl -fsSL -o "$tmpdir/$ASSET" "$URL"; then
  echo "Failed to download $URL" >&2
  exit 1
fi

tar -xzf "$tmpdir/$ASSET" -C "$tmpdir"

# Locate the storyteller binary inside the archive.
src=""
if [ -f "$tmpdir/storyteller" ]; then
  src="$tmpdir/storyteller"
elif [ -f "$tmpdir/${OS}_${ARCH}/storyteller" ]; then
  src="$tmpdir/${OS}_${ARCH}/storyteller"
else
  src="$(find "$tmpdir" -maxdepth 3 -type f -name storyteller | head -n1)"
fi
if [ -z "$src" ] || [ ! -f "$src" ]; then
  echo "Could not locate storyteller binary inside archive." >&2
  exit 1
fi

install -m 0755 "$src" "$TARGET"
echo "Installed: $TARGET"

# PATH check
case ":${PATH}:" in
  *":${PREFIX}:"*)
    : ;;
  *)
    echo ""
    echo "NOTE: ${PREFIX} is not in your PATH."
    echo "Add the following line to your shell profile (e.g. ~/.bashrc, ~/.zshrc):"
    echo "  export PATH=\"${PREFIX}:\$PATH\""
    ;;
esac

if command -v storyteller >/dev/null 2>&1; then
  storyteller --version || true
else
  "$TARGET" --version || true
fi
