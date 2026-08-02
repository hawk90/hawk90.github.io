#!/usr/bin/env bash
# spec-section.sh — find a section in cached CXL spec text
#
# Usage:
#   ./scripts/spec-section.sh 1.4         # section 1.4 only (first match → next sibling)
#   ./scripts/spec-section.sh 3.2.4.1     # nested section
#   ./scripts/spec-section.sh --list 1    # list all sub-sections of Ch 1
#   ./scripts/spec-section.sh --grep "<term>"   # search for a term

set -euo pipefail

CACHE="$(cd "$(dirname "$0")/.." && pwd)/data/cxl-spec-cache/cxl-4.0-rev1.0.txt"

if [ ! -f "$CACHE" ]; then
  echo "✗ Spec cache 없음: $CACHE"
  echo "  PDF에서 추출 필요:"
  echo "  pdftotext -layout <pdf> $CACHE"
  exit 1
fi

case "${1:-}" in
  --list)
    chap="${2:-}"
    [[ "$chap" =~ ^[0-9]+$ ]] || { echo "--list requires a numeric chapter" >&2; exit 2; }
    grep -nE "^[ ]+${chap}\.[0-9]+([\.0-9]+)? +[A-Z]" "$CACHE" | head -50 || true
    ;;
  --grep)
    shift
    [ $# -gt 0 ] || { echo "--grep requires a search term" >&2; exit 2; }
    grep -niF -- "$*" "$CACHE" | head -30 || true
    ;;
  --help|-h|"")
    sed -n '2,12p' "$0"
    exit 0
    ;;
  *)
    sec="$1"
    [[ "$sec" =~ ^[0-9]+(\.[0-9]+)*$ ]] || { echo "Section must be numeric (for example: 3.2.4)" >&2; exit 2; }
    # Contents precedes the body. Take the first plausible body heading rather
    # than the last matching line, which could be a cross-reference appendix.
    line=$(awk -v sec="$sec" '$0 ~ "^[ ]+" sec " +[A-Z]" && NR > 200 { print NR; exit }' "$CACHE")
    if [ -z "$line" ]; then
      echo "✗ Section $sec not found"
      exit 1
    fi
    # Print 60 lines from there
    sed -n "${line},$((line+60))p" "$CACHE"
    ;;
esac
