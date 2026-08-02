#!/usr/bin/env bash
# build-diagrams.sh — incremental TikZ → SVG compiler
#
# Walks public/images/blog/**/*.tex, compiles each to .svg next to it.
# - Skips files where .svg is newer than .tex (incremental)
# - Uses xelatex when fontspec or Hangul detected, else pdflatex
# - Cleans aux files after every build
# - Pass --force to rebuild everything
# - Pass a path to rebuild a single file
#
# Examples:
#   ./scripts/build-diagrams.sh                        # incremental, all
#   ./scripts/build-diagrams.sh --force                # rebuild everything
#   ./scripts/build-diagrams.sh path/to/diagram.tex    # single file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"
FORCE=0
TARGET=""
COUNT_BUILT=0
COUNT_SKIPPED=0
COUNT_FAILED=0

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    *) TARGET="$arg" ;;
  esac
done

needs_xelatex() {
  grep -qE '(usepackage\{fontspec\}|[가-힣])' "$1"
}

dependency_changed() {
  local tex="$1" svg="$2" dep rel
  # A diagram is stale when its source or any relative \input dependency is
  # newer. This covers _design.tex, _design-state.tex, _design-sequence.tex,
  # _design-math.tex, and future shared style files without a hard-coded list.
  [[ "$tex" -nt "$svg" ]] && return 0
  while IFS= read -r dep; do
    rel="${dep#\\input{}"
    rel="${rel%\}}"
    [[ -z "$rel" ]] && continue
    if [[ "$rel" != /* ]]; then
      dep="$(dirname "$tex")/$rel"
    else
      dep="$ROOT$rel"
    fi
    [[ -f "$dep" && "$dep" -nt "$svg" ]] && return 0
  done < <(grep -oE '\\input\{[^}]+\}' "$tex" || true)
  return 1
}

build_one() {
  local tex="$1"
  local dir base svg
  dir="$(dirname "$tex")"
  base="$(basename "$tex" .tex)"
  svg="$dir/$base.svg"

  # Skip _design.tex and _preamble-style files (not standalone)
  if [[ "$base" == _* ]]; then
    return 0
  fi
  if [[ ! -f "$tex" || "${tex##*.}" != "tex" ]]; then
    echo "✗ not a readable .tex file: $tex" >&2
    COUNT_FAILED=$((COUNT_FAILED + 1))
    return 0
  fi

  if [[ $FORCE -eq 0 && -f "$svg" ]] && ! dependency_changed "$tex" "$svg"; then
    COUNT_SKIPPED=$((COUNT_SKIPPED + 1))
    return 0
  fi

  # A stale PDF must never make a failed compile look successful.
  rm -f "$dir/$base.pdf"
  if (
    cd "$dir"
    if needs_xelatex "$base.tex"; then
      xelatex -interaction=nonstopmode -halt-on-error "$base.tex" >/dev/null 2>&1
    else
      pdflatex -interaction=nonstopmode -halt-on-error "$base.tex" >/dev/null 2>&1
    fi
  ); then
    if ! pdftocairo -svg "$dir/$base.pdf" "$svg" 2>/dev/null; then
      echo "✗ SVG conversion failed: $tex" >&2
      rm -f "$dir/$base.aux" "$dir/$base.log" "$dir/$base.pdf"
      COUNT_FAILED=$((COUNT_FAILED + 1))
      return 0
    fi
    rm -f "$dir/$base.aux" "$dir/$base.log" "$dir/$base.pdf"
    echo "✓ $tex"
    COUNT_BUILT=$((COUNT_BUILT + 1))
  else
    echo "✗ compilation failed: $tex" >&2
    rm -f "$dir/$base.aux" "$dir/$base.log" "$dir/$base.pdf"
    COUNT_FAILED=$((COUNT_FAILED + 1))
  fi
}

if [[ -n "$TARGET" ]]; then
  build_one "$TARGET"
else
  while IFS= read -r tex; do
    build_one "$tex"
  done < <(find "$DIAG_ROOT" -type f -name '*.tex' | sort)
fi

echo
echo "Built: $COUNT_BUILT  Skipped: $COUNT_SKIPPED  Failed: $COUNT_FAILED"
[[ $COUNT_FAILED -eq 0 ]]
