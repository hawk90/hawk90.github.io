#!/usr/bin/env bash
# detect-ascii-diagrams.sh — find ASCII box diagrams in markdown
#
# CLAUDE.md §6 forbids ASCII box diagrams (┌──┐ │ etc.) in markdown.
# These must be TikZ diagrams instead. Directory trees (├── └──) are
# the only allowed exception.
#
# Usage:
#   ./scripts/detect-ascii-diagrams.sh                    # all published .md
#   ./scripts/detect-ascii-diagrams.sh src/content/blog/embedded/hardware/hbm/
#   ./scripts/detect-ascii-diagrams.sh --include-drafts   # scan drafts too
#
# Exit code:
#   0 = no violations
#   1 = violations found

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INCLUDE_DRAFTS=0
TARGETS=()

for arg in "$@"; do
  case "$arg" in
    --include-drafts) INCLUDE_DRAFTS=1 ;;
    --help|-h)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *) TARGETS+=("$arg") ;;
  esac
done

if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("$ROOT/src/content/blog")
fi

# Box drawing characters to detect (excluding directory tree markers)
# The pattern matches:
#   ┌ ┐ ┘ ┬ ┤ ┴ ┼  (box drawing corners and joins)
#   ━━ (heavy horizontal - bar chart)
# Note: ├ └ │ are allowed only when used in directory tree style:
#   line ending in `├── name/` or `└── name/` (with name)
# Filtered out post-hoc to avoid false positives on dir trees.
SUSPECT_PATTERN='(┌|┐|┘|┬|┤|┴|┼|━━)'

# Allowed directory tree pattern — lines that match these are NOT violations
DIR_TREE_PATTERN='([├└][─].+/|│[ ]*[├└])'

VIOLATIONS=0
VIOLATING_FILES=()

while IFS= read -r f; do
  # Skip drafts unless --include-drafts
  if [ "$INCLUDE_DRAFTS" -eq 0 ]; then
    if grep -q "^draft: true" "$f"; then
      continue
    fi
  fi

  # Count suspect lines, excluding directory tree patterns
  matches=$(grep -cE "$SUSPECT_PATTERN" "$f" 2>/dev/null) || matches=0
  matches=${matches:-0}

  if [ "$matches" -gt 0 ] 2>/dev/null; then
    VIOLATIONS=$((VIOLATIONS + matches))
    VIOLATING_FILES+=("$f")
    relpath="${f#$ROOT/}"
    printf "  %-65s %s lines\n" "$relpath" "$matches"
  fi
done < <(find "${TARGETS[@]}" -name "*.md" -type f)

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✓ No ASCII box diagram violations found."
  exit 0
else
  echo "✗ Found $VIOLATIONS suspect lines across ${#VIOLATING_FILES[@]} files."
  echo ""
  echo "Per CLAUDE.md §6:"
  echo "  - Sequence/topology/state diagrams → TikZ (public/images/blog/.../diagrams/)"
  echo "  - Tabular data → markdown tables"
  echo "  - Directory trees (├── └──) → keep as text block (allowed exception)"
  exit 1
fi
