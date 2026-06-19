#!/usr/bin/env bash
# spec-section.sh — find a section in cached CXL spec text
#
# Usage:
#   ./scripts/spec-section.sh 1.4         # section 1.4 only (first match → next sibling)
#   ./scripts/spec-section.sh 3.2.4.1     # nested section
#   ./scripts/spec-section.sh --list 1    # list all sub-sections of Ch 1
#   ./scripts/spec-section.sh --grep "<term>"   # search for a term

set -eo pipefail

CACHE="$(cd "$(dirname "$0")/.." && pwd)/data/cxl-spec-cache/cxl-4.0-rev1.0.txt"

if [ ! -f "$CACHE" ]; then
  echo "✗ Spec cache 없음: $CACHE"
  echo "  PDF에서 추출 필요:"
  echo "  pdftotext -layout <pdf> $CACHE"
  exit 1
fi

case "${1:-}" in
  --list)
    chap="$2"
    grep -nE "^[ ]+${chap}\.[0-9]+([\.0-9]+)? +[A-Z]" "$CACHE" | head -50
    ;;
  --grep)
    shift
    grep -nE -i "$@" "$CACHE" | head -30
    ;;
  --help|-h|"")
    sed -n '2,12p' "$0"
    exit 0
    ;;
  *)
    sec="$1"
    # Find first body occurrence (not ToC) by skipping early lines
    line=$(grep -nE "^[ ]+${sec//./\\.} +[A-Z]" "$CACHE" | tail -1 | cut -d: -f1)
    if [ -z "$line" ]; then
      echo "✗ Section $sec not found"
      exit 1
    fi
    # Print 60 lines from there
    sed -n "${line},$((line+60))p" "$CACHE"
    ;;
esac
