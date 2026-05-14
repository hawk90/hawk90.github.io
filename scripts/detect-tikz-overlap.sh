#!/usr/bin/env bash
# detect-tikz-overlap.sh — heuristic overlap-risk detector for TikZ source files
#
# Scans public/images/blog/**/*.tex and assigns each file a numeric "overlap
# risk score" based on patterns that commonly produce unreadable diagrams.
# Outputs a ranked list to stdout (and to /tmp/tikz-overlap-report.txt).
#
# Signals scored:
#   - Multi-line node content (\\ inside nodes)
#   - Long Korean labels (>12 Hangul characters)
#   - Densely-packed (x,y) coordinates (pairs within 0.5 units)
#   - High raw node count
#
# Heuristic only — does NOT render. Use the resulting list to choose files
# to inspect visually.
#
# Usage:
#   ./scripts/detect-tikz-overlap.sh            # print top 40
#   ./scripts/detect-tikz-overlap.sh --all      # print all
#   ./scripts/detect-tikz-overlap.sh --series uml   # filter by series

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"
REPORT="/tmp/tikz-overlap-report.txt"
LIMIT=40
SERIES_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --all) LIMIT=0 ;;
    --series) shift; SERIES_FILTER="$1" ;;
  esac
done

PYTHON=$(command -v python3)
if [[ -z "$PYTHON" ]]; then
  echo "python3 required" >&2; exit 1
fi

"$PYTHON" - "$DIAG_ROOT" "$SERIES_FILTER" "$LIMIT" "$REPORT" <<'PY'
import os, re, sys
from pathlib import Path

diag_root = Path(sys.argv[1])
series_filter = sys.argv[2]
limit = int(sys.argv[3])
report_path = Path(sys.argv[4])

coord_re = re.compile(r'\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)')
hangul = lambda s: sum(1 for c in s if 0xAC00 <= ord(c) <= 0xD7A3)

def score(path: Path) -> dict:
    text = path.read_text(encoding='utf-8', errors='ignore')
    s = {'multiline': 0, 'long_korean': 0, 'close_coords': 0, 'node_density': 0}

    # \\ line breaks (multi-line node content)
    s['multiline'] = text.count(r'\\') * 2

    # Long Korean labels per line
    for line in text.split('\n'):
        h = hangul(line)
        if h > 12:
            s['long_korean'] += h - 12

    # Close-pair coordinates
    coords = [(float(x), float(y)) for x, y in coord_re.findall(text)]
    close = 0
    for i, (x1, y1) in enumerate(coords):
        for x2, y2 in coords[i+1:]:
            d2 = (x1-x2)**2 + (y1-y2)**2
            if d2 < 0.25:  # within 0.5 units
                close += 1
    s['close_coords'] = close * 3

    # Node density bonus
    nodes = text.count('\\node')
    s['node_density'] = nodes // 5

    s['total'] = sum(s.values()) - s['total'] if 'total' in s else (
        s['multiline'] + s['long_korean'] + s['close_coords'] + s['node_density']
    )
    return s

rows = []
for tex in sorted(diag_root.rglob('*.tex')):
    if tex.name.startswith('_'):
        continue
    rel = tex.relative_to(diag_root)
    parts = rel.parts
    series = parts[0] if parts else ''
    if series_filter and series != series_filter:
        continue
    s = score(tex)
    rows.append((s['total'], s, str(rel)))

rows.sort(key=lambda r: -r[0])

# Print + write report
def fmt(s):
    return (
        f"ml={s['multiline']:>3} "
        f"kor={s['long_korean']:>3} "
        f"close={s['close_coords']:>3} "
        f"dens={s['node_density']:>3}"
    )

header = f"{'#':>4}  {'score':>5}  signals                            file"
out_lines = [header, '-' * len(header)]
for i, (total, s, path) in enumerate(rows, 1):
    out_lines.append(f"{i:>4}  {total:>5}  {fmt(s)}  {path}")

report_path.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')

show = out_lines if limit == 0 else out_lines[:limit + 2]
print('\n'.join(show))
print()
print(f"Total files: {len(rows)}")
print(f"Full report: {report_path}")
PY
