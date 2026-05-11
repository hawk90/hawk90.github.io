#!/usr/bin/env bash
# build-tikz.sh — compile a .tex file to .svg via pdflatex + pdftocairo
# Usage: build-tikz.sh path/to/diagram.tex

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "usage: $0 <file.tex>" >&2
    exit 1
fi

src="$1"
dir="$(dirname "$src")"
base="$(basename "$src" .tex)"

cd "$dir"
# Use xelatex when fontspec is loaded OR Hangul is present; else pdflatex
if grep -qE '(usepackage\{fontspec\}|[가-힣])' "$base.tex"; then
    xelatex -interaction=nonstopmode -halt-on-error "$base.tex" >/dev/null
else
    pdflatex -interaction=nonstopmode -halt-on-error "$base.tex" >/dev/null
fi
pdftocairo -svg "$base.pdf" "$base.svg"

# cleanup auxiliary files
rm -f "$base.aux" "$base.log" "$base.pdf"
echo "built: $dir/$base.svg"
