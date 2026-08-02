#!/usr/bin/env bash
# watch-diagrams.sh — rebuild SVGs as their .tex sources change.
#
# Requires fswatch (macOS): brew install fswatch
# On change: builds the changed .tex. Any shared _*.tex dependency rebuilds all.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"

if ! command -v fswatch >/dev/null; then
  echo "fswatch not found. Install with: brew install fswatch" >&2
  exit 1
fi

echo "Watching $DIAG_ROOT for *.tex changes..."
"$ROOT/scripts/build-diagrams.sh"

LOCK_DIR="$ROOT/.cache/diagram-watch.lock"
mkdir -p "$(dirname "$LOCK_DIR")"

run_build() {
  local file="$1"
  # fswatch can emit several events for one save. A mkdir lock prevents
  # overlapping TeX/PDF conversions and leaves the next event to re-check.
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    return 0
  fi
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' RETURN
  if [[ "$file" == *.tex && "$(basename "$file")" == _* ]]; then
    "$ROOT/scripts/build-diagrams.sh"
  else
    "$ROOT/scripts/build-diagrams.sh" "$file"
  fi
}

cleanup() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

fswatch -0 -e '\.svg$' -e '\.aux$' -e '\.log$' -e '\.pdf$' \
        --include '\.tex$' --extended \
        "$DIAG_ROOT" |
  while IFS= read -r -d '' file; do
    if [[ "$file" == *.tex ]]; then
      run_build "$file" || echo "Diagram rebuild failed: $file" >&2
    fi
  done
