#!/usr/bin/env bash
# detect-prose-in-code.sh — find code blocks (```text and friends) that
# contain non-code content: checkboxes, Korean prose, bullet lists, etc.
#
# Rule (CLAUDE.md §5): code blocks for code / output / pseudocode / config
# / UML syntax samples. NOT for Korean prose, bullet/checkbox lists, or
# markdown tables.
#
# Usage:
#   ./scripts/detect-prose-in-code.sh [--published-only]
#
# Output: file:line  reason  snippet

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_ROOT="$ROOT/src/content/blog"
PUBLISHED_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --published-only) PUBLISHED_ONLY=1 ;;
  esac
done

# Heuristics for "this block is prose, not code":
#   - markdown checkbox:        `[ ]` or `[x]` or `[X]` at line start
#   - bullet-with-Korean:       starts with `- ` or `* ` followed by Hangul
#   - heading-style label:      `**...**` markdown bold at line start
#   - all-Hangul prose line     (line has 6+ Hangul chars, no code symbols)

check_block() {
  local file="$1"
  local start_line="$2"
  local end_line="$3"
  local lang="$4"

  # Skip non-text language blocks (cpp/python/etc are presumed code)
  case "$lang" in
    ''|text|asciidoc|markdown|md) ;;
    *) return 0 ;;
  esac

  local block
  block=$(sed -n "$((start_line+1)),$((end_line-1))p" "$file")

  local reasons=""
  local snippet=""

  # Checkboxes — markdown task list inside text block
  if echo "$block" | grep -qE '^\s*\[[ xX]\]\s'; then
    reasons="${reasons}checkbox "
    snippet=$(echo "$block" | grep -m1 -E '^\s*\[[ xX]\]\s' | sed 's/^[[:space:]]*//' | cut -c1-50)
  fi

  # Bold markdown labels — **...**
  if echo "$block" | grep -qE '^\*\*[^*]+\*\*\s*$'; then
    reasons="${reasons}bold-label "
    [[ -z "$snippet" ]] && snippet=$(echo "$block" | grep -m1 -E '^\*\*' | cut -c1-50)
  fi

  # Bullet with Korean — `- 가나다…` or `* 가나다…`
  if echo "$block" | grep -qE '^[[:space:]]*[-*][[:space:]]+[가-힣]'; then
    reasons="${reasons}korean-bullet "
    [[ -z "$snippet" ]] && snippet=$(echo "$block" | grep -m1 -E '^[[:space:]]*[-*][[:space:]]+[가-힣]' | sed 's/^[[:space:]]*//' | cut -c1-50)
  fi

  # Korean prose — line with 6+ Hangul chars and no code-y symbols
  # Use Python for safe UTF-8 handling.
  local korean_prose_line
  korean_prose_line=$(echo "$block" | LC_ALL=en_US.UTF-8 python3 -c '
import sys, re
for line in sys.stdin:
    h = len(re.findall(r"[가-힣]", line))
    # exclude lines with code-style operators or assignment
    has_op = bool(re.search(r"[=:;{}()\[\]<>|]", line))
    if h >= 6 and not has_op:
        sys.stdout.write(line)
        break
' 2>/dev/null)
  if [[ -n "$korean_prose_line" ]]; then
    reasons="${reasons}korean-prose "
    [[ -z "$snippet" ]] && snippet=$(echo "$korean_prose_line" | sed 's/^[[:space:]]*//' | cut -c1-60)
  fi

  if [[ -n "$reasons" ]]; then
    printf "%s:%d  [%s]  %s\n" "${file#$ROOT/}" "$start_line" "${reasons% }" "$snippet"
  fi
}

scan_file() {
  local file="$1"

  if [[ $PUBLISHED_ONLY -eq 1 ]]; then
    grep -q "^draft: false" "$file" 2>/dev/null || return 0
  fi

  # Find triple-backtick blocks and their language tags
  # Using awk to track open/close state
  awk -v F="$file" '
    /^```/ {
      if (!in_block) {
        in_block = 1;
        start = NR;
        lang = substr($0, 4);
        gsub(/[[:space:]]/, "", lang);
      } else {
        in_block = 0;
        print start "\t" NR "\t" lang;
      }
    }
  ' "$file" | while IFS=$'\t' read -r start end lang; do
    check_block "$file" "$start" "$end" "$lang"
  done
}

find "$CONTENT_ROOT" -type f -name '*.md' -print0 |
  while IFS= read -r -d '' f; do
    scan_file "$f"
  done
