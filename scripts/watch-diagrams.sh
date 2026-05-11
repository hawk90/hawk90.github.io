#!/usr/bin/env bash
# watch-diagrams.sh — rebuild SVGs as their .tex sources change.
#
# Requires fswatch (macOS): brew install fswatch
# On change: builds only the changed .tex via build-diagrams.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"

if ! command -v fswatch >/dev/null; then
  echo "fswatch not found. Install with: brew install fswatch" >&2
  exit 1
fi

echo "Watching $DIAG_ROOT for *.tex changes..."
"$ROOT/scripts/build-diagrams.sh"

fswatch -0 -e '\.svg$' -e '\.aux$' -e '\.log$' -e '\.pdf$' \
        --include '\.tex$' --extended \
        "$DIAG_ROOT" |
  while IFS= read -r -d '' file; do
    if [[ "$file" == *.tex ]]; then
      "$ROOT/scripts/build-diagrams.sh" "$file" || true
    fi
  done
