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

# draft:true in the frontmatter only — a `draft: true` line in a code sample
# in the body must not hide a published post from the checks.
is_draft() { awk 'NR==1 && $0 != "---" {exit} NR>1 && /^---[[:space:]]*$/ {exit} NR>1 && /^draft:[[:space:]]*true[[:space:]]*$/ {d=1; exit} END {exit !d}' "$1"; }

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
for t in "${TARGETS[@]}"; do
  [ -e "$t" ] || { echo "✗ 경로 없음: $t (검사 0건을 통과로 보고하지 않도록 중단)" >&2; exit 2; }
done

VIOLATIONS=0
VIOLATING_FILES=()

count_suspects() {
  awk '
    BEGIN { in_fence = 0; in_frontmatter = 0 }
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter { if ($0 == "---") in_frontmatter = 0; next }
    # CommonMark fences: close only on the same char, at least as long.
    match($0, /^[ \t]*(````*|~~~~*)/) {
      mark = substr($0, RSTART, RLENGTH); gsub(/[ \t]/, "", mark); rest = substr($0, RSTART + RLENGTH)
      if (fc == "") { if (!(substr(mark, 1, 1) == "`" && index(rest, "`"))) { fc = substr(mark, 1, 1); fn = length(mark); next } }
      else if (substr(mark, 1, 1) == fc && length(mark) >= fn && rest ~ /^[ \t]*$/) { fc = ""; next }
    }
    fc == "" && /┌|┐|┘|┬|┤|┴|┼|━━/ { count++ }
    END { print count + 0 }
  ' "$1"
}

while IFS= read -r -d '' f; do
  # Skip drafts unless --include-drafts
  if [ "$INCLUDE_DRAFTS" -eq 0 ]; then
    if is_draft "$f"; then
      continue
    fi
  fi

  # Code examples and frontmatter can legitimately describe these characters;
  # only prose is subject to the diagram policy.
  matches=$(count_suspects "$f")

  if [ "$matches" -gt 0 ] 2>/dev/null; then
    VIOLATIONS=$((VIOLATIONS + matches))
    VIOLATING_FILES+=("$f")
    relpath="${f#$ROOT/}"
    printf "  %-65s %s lines\n" "$relpath" "$matches"
  fi
done < <(find "${TARGETS[@]}" -name "*.md" -type f -print0)

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
