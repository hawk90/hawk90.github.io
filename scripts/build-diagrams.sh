#!/usr/bin/env bash
# build-diagrams.sh — incremental TikZ → SVG compiler
#
# Walks public/images/blog/**/*.tex, compiles each to .svg next to it.
# - Incremental by CONTENT, not mtime: each .svg carries a stamp comment
#   (<!-- tikz-src sha256=... -->) hashing the .tex plus its relative \input
#   dependencies (_design*.tex). A diagram rebuilds only when that hash
#   changes. mtime was unreliable: git checkout/pull rewrites mtimes, which
#   both rebuilt untouched diagrams and hid .tex edits whose .svg was stale.
# - Uses xelatex when fontspec or Hangul detected, else pdflatex
# - Cleans aux files after every build
# - Pass --force to rebuild everything
# - Pass --check to report diagrams whose .svg does not match its .tex
#   (no build; exit 1 if any). Used by the pre-commit hook.
# - Pass --stamp to write the stamp into existing .svg files that lack one,
#   without rebuilding (one-time migration; trusts the current .svg)
# - Pass a path to rebuild (or --check) a single file
#
# Examples:
#   ./scripts/build-diagrams.sh                        # incremental, all
#   ./scripts/build-diagrams.sh --force                # rebuild everything
#   ./scripts/build-diagrams.sh --check                # stale/unstamped report
#   ./scripts/build-diagrams.sh path/to/diagram.tex    # single file

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"
# Copied from ../book-notes by `npm run sync:book-notes` (CLAUDE.md §12).
# Never rebuild or stamp them here; fix the source repo and re-sync instead.
SYNCED_DIRS=(linear-algebra set-theory)
FORCE=0
MODE="build"
TARGET=""
COUNT_BUILT=0
COUNT_SKIPPED=0
COUNT_FAILED=0

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    --check) MODE="check" ;;
    --stamp) MODE="stamp" ;;
    *) if [[ -e "$arg" ]]; then
         TARGET="$(cd "$(dirname "$arg")" && pwd)/$(basename "$arg")"
       else
         TARGET="$arg"
       fi ;;
  esac
done

needs_xelatex() {
  # fontspec, Hangul text, or kotex's XeTeX-only font commands
  # (\setmainhangulfont etc. fail under pdflatex even with no Hangul glyphs).
  grep -qE '(usepackage\{fontspec\}|[가-힣]|set(main|sans|mono)hangulfont)' "$1"
}

# Hash of the .tex plus every relative \input dependency (_design.tex,
# _design-state.tex, ...), so a shared style change marks all users stale.
source_hash() {
  local tex="$1" dep rel
  {
    cat "$tex"
    while IFS= read -r dep; do
      rel="${dep#\\input{}"
      rel="${rel%\}}"
      [[ -z "$rel" ]] && continue
      if [[ "$rel" != /* ]]; then
        dep="$(dirname "$tex")/$rel"
      else
        dep="$ROOT$rel"
      fi
      [[ -f "$dep" ]] && cat "$dep"
    done < <(grep -oE '\\input\{[^}]+\}' "$tex" || true)
  } | shasum -a 256 | cut -d' ' -f1
}

svg_stamp() {
  grep -m1 -oE 'tikz-src sha256=[0-9a-f]{64}' "$1" 2>/dev/null | cut -d= -f2 || true
}

# Insert (or replace) the stamp comment right after the XML declaration.
write_stamp() {
  local svg="$1" hash="$2" tmp
  tmp="$(mktemp)"
  awk -v h="$hash" '
    /<!-- tikz-src sha256=[0-9a-f]+ -->/ { next }
    { print }
    NR == 1 { print "<!-- tikz-src sha256=" h " -->" }
  ' "$svg" > "$tmp" && cat "$tmp" > "$svg"
  rm -f "$tmp"
}

COUNT_STALE=0
COUNT_GLYPH=0

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
  local synced
  for synced in "${SYNCED_DIRS[@]}"; do
    if [[ "$tex" == "$DIAG_ROOT/$synced/"* ]]; then
      COUNT_SKIPPED=$((COUNT_SKIPPED + 1))
      return 0
    fi
  done
  if [[ ! -f "$tex" || "${tex##*.}" != "tex" ]]; then
    echo "✗ not a readable .tex file: $tex" >&2
    COUNT_FAILED=$((COUNT_FAILED + 1))
    return 0
  fi

  local hash stamp
  hash="$(source_hash "$tex")"
  stamp=""
  [[ -f "$svg" ]] && stamp="$(svg_stamp "$svg")"

  if [[ "$MODE" == "check" ]]; then
    if [[ ! -f "$svg" ]]; then
      echo "✗ missing svg: ${tex#$ROOT/}"; COUNT_STALE=$((COUNT_STALE + 1))
    elif [[ -z "$stamp" ]]; then
      echo "✗ unstamped svg (run build or --stamp): ${svg#$ROOT/}"; COUNT_STALE=$((COUNT_STALE + 1))
    elif [[ "$stamp" != "$hash" ]]; then
      echo "✗ stale svg (tex changed, svg not rebuilt): ${tex#$ROOT/}"; COUNT_STALE=$((COUNT_STALE + 1))
    fi
    return 0
  fi

  if [[ "$MODE" == "stamp" ]]; then
    if [[ -f "$svg" && -z "$stamp" ]]; then
      write_stamp "$svg" "$hash"; COUNT_BUILT=$((COUNT_BUILT + 1))
    else
      COUNT_SKIPPED=$((COUNT_SKIPPED + 1))
    fi
    return 0
  fi

  if [[ $FORCE -eq 0 && -f "$svg" && "$stamp" == "$hash" ]]; then
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
    # Glyphs the font lacks (μ, arrows, Hangul under pdflatex) compile fine but
    # render as blank boxes. Surface them instead of shipping a silent gap.
    local missing
    missing="$(grep -oE 'Missing character: There is no [^ ]+' "$dir/$base.log" 2>/dev/null \
      | sed 's/.*There is no //' | sort -u | tr '\n' ' ' || true)"
    if [[ -n "$missing" ]]; then
      echo "⚠ missing glyphs in ${tex#$ROOT/}: $missing" >&2
      COUNT_GLYPH=$((COUNT_GLYPH + 1))
    fi
    rm -f "$dir/$base.aux" "$dir/$base.log" "$dir/$base.pdf"
    write_stamp "$svg" "$hash"
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

if [[ "$MODE" == "check" ]]; then
  echo
  echo "Stale/unstamped: $COUNT_STALE"
  [[ $COUNT_STALE -eq 0 ]]
  exit
fi

echo
if [[ "$MODE" == "stamp" ]]; then
  echo "Stamped: $COUNT_BUILT  Already stamped: $COUNT_SKIPPED"
else
  echo "Built: $COUNT_BUILT  Skipped: $COUNT_SKIPPED  Failed: $COUNT_FAILED  Missing-glyph warnings: $COUNT_GLYPH"
fi
[[ $COUNT_FAILED -eq 0 ]]
