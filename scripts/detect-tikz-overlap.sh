#!/usr/bin/env bash
# detect-tikz-overlap.sh — heuristic overlap-risk detector for TikZ source files
#
# Scans public/images/blog/**/*.tex and assigns each file a numeric "overlap
# risk score" based on patterns that commonly produce unreadable diagrams.
# Outputs a ranked list to stdout (and to /tmp/tikz-overlap-report.txt).
#
# Signals scored (strict by default — aligned with CLAUDE.md §6 TikZ rules):
#   - `\\` without explicit `\\[Npt]` spacing (CLAUDE.md: use `\\[2pt]`)
#   - Long Korean labels (>8 Hangul chars) without `text width=`
#   - Dense (x,y) coordinates (pairs within 0.3 units — strict)
#   - High node count without `text width` declared
#   - `\node at (x,y) {...}` with long Korean (no anchor / no width)
#   - `rotate=90` labels (CLAUDE.md flags as collision-prone)
#   - Missing `\input{../../_design.tex}` (no shared style)
#   - `\begin{tikzpicture}` without `[blog]` style
#   - `node distance` less than 0.5cm
#   - Coordinate `|-` / `-|` projection (often miscomputed)
#
# Heuristic only — does NOT render. Use the resulting list to choose files
# to inspect visually. For ground truth, run detect-text-overlap.py.
#
# Usage:
#   ./scripts/detect-tikz-overlap.sh                  # print top 40 (strict)
#   ./scripts/detect-tikz-overlap.sh --all            # print all
#   ./scripts/detect-tikz-overlap.sh --series uml     # filter by series
#   ./scripts/detect-tikz-overlap.sh --loose          # disable strict signals
#   ./scripts/detect-tikz-overlap.sh --fail-above 30  # exit non-zero if any file scores > N

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIAG_ROOT="$ROOT/public/images/blog"
REPORT="/tmp/tikz-overlap-report.txt"
LIMIT=40
SERIES_FILTER=""
STRICT=1
FAIL_ABOVE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) LIMIT=0; shift ;;
    --series) shift; SERIES_FILTER="${1:-}"; shift ;;
    --limit) shift; LIMIT="${1:-40}"; shift ;;
    --loose) STRICT=0; shift ;;
    --strict) STRICT=1; shift ;;
    --fail-above) shift; FAIL_ABOVE="${1:-}"; shift ;;
    *) shift ;;
  esac
done

PYTHON=$(command -v python3)
if [[ -z "$PYTHON" ]]; then
  echo "python3 required" >&2; exit 1
fi

"$PYTHON" - "$DIAG_ROOT" "$SERIES_FILTER" "$LIMIT" "$REPORT" "$STRICT" "${FAIL_ABOVE:-}" <<'PY'
import os, re, sys
from pathlib import Path

diag_root = Path(sys.argv[1])
series_filter = sys.argv[2]
limit = int(sys.argv[3])
report_path = Path(sys.argv[4])
strict = sys.argv[5] == "1"
fail_above = sys.argv[6]
fail_above_val = int(fail_above) if fail_above else None

# Strictness thresholds
LONG_KOREAN_STRICT = 8     # strict — flag >8 hangul chars on a line
LONG_KOREAN_LOOSE = 12     # loose
CLOSE_COORD_STRICT = 0.3   # strict — pairs within 0.3 units
CLOSE_COORD_LOOSE = 0.5    # loose
LONG_KOREAN = LONG_KOREAN_STRICT if strict else LONG_KOREAN_LOOSE
CLOSE_COORD = CLOSE_COORD_STRICT if strict else CLOSE_COORD_LOOSE

coord_re = re.compile(r'\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)')
backslash_break_re = re.compile(r'\\\\(?!\s*\[)')     # `\\` NOT followed by `[`
backslash_spaced_re = re.compile(r'\\\\\s*\[')         # `\\[` (good)
text_width_re = re.compile(r'text\s+width\s*=')
node_at_long_re = re.compile(r'\\node\s+at\s*\([^)]*\)\s*\{[^{}]*[가-힣]{8,}')
rotate_re = re.compile(r'rotate\s*=\s*(-?\d+)')
input_design_re = re.compile(r'\\input\{[^}]*_design[^}]*\.tex\}')
tikz_blog_re = re.compile(r'\\begin\{tikzpicture\}\s*\[\s*blog\s*[,\]]')
tikz_any_re = re.compile(r'\\begin\{tikzpicture\}')
node_distance_re = re.compile(r'node\s+distance\s*=\s*([\d.]+)\s*(cm|mm|pt|em)?')
projection_re = re.compile(r'\|-|-\|')

hangul = lambda s: sum(1 for c in s if 0xAC00 <= ord(c) <= 0xD7A3)


def score(path: Path) -> dict:
    text = path.read_text(encoding='utf-8', errors='ignore')
    s = {
        'multiline_bad': 0,    # \\ without [Npt]
        'long_korean': 0,      # long Korean labels
        'close_coords': 0,     # tight coordinates
        'node_density': 0,     # raw node count bonus
        'node_at_long': 0,     # \node at (...) {<long korean>}
        'rotate_label': 0,     # rotate=90/non-zero labels
        'no_design_input': 0,  # missing \input{_design.tex}
        'no_blog_style': 0,    # tikzpicture without [blog]
        'close_node_dist': 0,  # node distance < 0.5cm
        'projection_use': 0,   # |- or -| projections
    }

    # Multi-line node content
    bad_breaks = len(backslash_break_re.findall(text))
    good_breaks = len(backslash_spaced_re.findall(text))
    # Bad breaks penalised double in strict mode
    s['multiline_bad'] = bad_breaks * (3 if strict else 2)
    # Good breaks (with [Npt]) don't penalise

    # Long Korean labels per line (only flag if no text width hint nearby)
    has_text_width = bool(text_width_re.search(text))
    for line in text.split('\n'):
        h = hangul(line)
        if h > LONG_KOREAN:
            penalty = (h - LONG_KOREAN)
            if not has_text_width:
                penalty *= 2  # double if no text width anywhere
            s['long_korean'] += penalty

    # Close-pair coordinates
    coords = [(float(x), float(y)) for x, y in coord_re.findall(text)]
    close = 0
    thr2 = CLOSE_COORD * CLOSE_COORD
    for i, (x1, y1) in enumerate(coords):
        for x2, y2 in coords[i+1:]:
            d2 = (x1-x2)**2 + (y1-y2)**2
            if d2 < thr2:
                close += 1
    s['close_coords'] = close * (4 if strict else 3)

    # Node density bonus
    nodes = text.count('\\node')
    s['node_density'] = nodes // (4 if strict else 5)

    # \node at (..) {<long korean>} pattern — high collision risk
    s['node_at_long'] = len(node_at_long_re.findall(text)) * 5

    # rotate=N (any non-zero rotate) labels are collision-prone
    rotates = [int(m) for m in rotate_re.findall(text) if int(m) != 0]
    s['rotate_label'] = len(rotates) * 2

    # Missing \input{_design.tex} — no shared style → fonts/spacing diverge
    if tikz_any_re.search(text) and not input_design_re.search(text):
        s['no_design_input'] = 5

    # \begin{tikzpicture} without [blog] style
    if tikz_any_re.search(text) and not tikz_blog_re.search(text):
        s['no_blog_style'] = 3

    # node distance < 0.5cm (auto-spacing too tight)
    for val, unit in node_distance_re.findall(text):
        v = float(val)
        unit = unit or 'cm'
        # Convert to cm
        if unit == 'mm':
            v_cm = v / 10
        elif unit == 'pt':
            v_cm = v / 28.45
        elif unit == 'em':
            v_cm = v * 0.4
        else:
            v_cm = v
        if v_cm < 0.5:
            s['close_node_dist'] += 4 if strict else 2

    # |- / -| projection (often misused, CLAUDE.md flags ordering)
    s['projection_use'] = len(projection_re.findall(text))

    s['total'] = sum(s.values())
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

def fmt(s):
    return (
        f"ml={s['multiline_bad']:>3} "
        f"kor={s['long_korean']:>3} "
        f"close={s['close_coords']:>3} "
        f"dens={s['node_density']:>2} "
        f"nA={s['node_at_long']:>2} "
        f"rot={s['rotate_label']:>2} "
        f"noD={s['no_design_input']:>1} "
        f"noB={s['no_blog_style']:>1} "
        f"nd={s['close_node_dist']:>2} "
        f"proj={s['projection_use']:>2}"
    )

mode = "strict" if strict else "loose"
header = f"{'#':>4}  {'score':>5}  signals ({mode}) "
header += " " * max(0, 72 - len(header)) + "file"
out_lines = [
    header,
    "-" * len(header),
    "# Legend: ml=`\\\\` w/o [Npt] | kor=long-Korean | close=tight-coords | "
    "dens=#nodes/4 | nA=node-at+long-Korean | rot=rotate-label | "
    "noD=no \\input{_design.tex} | noB=no [blog] style | "
    "nd=node-distance<0.5cm | proj=|-/-| projections",
    "",
]
for i, (total, s, path) in enumerate(rows, 1):
    out_lines.append(f"{i:>4}  {total:>5}  {fmt(s)}  {path}")

report_path.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')

show = out_lines if limit == 0 else (out_lines[:4] + out_lines[4:limit + 4])
print('\n'.join(show))
print()
print(f"Total files: {len(rows)}  (mode: {mode})")
print(f"Full report: {report_path}")

# Exit code for CI
if fail_above_val is not None:
    bad = [r for r in rows if r[0] > fail_above_val]
    if bad:
        print(f"\nFAIL: {len(bad)} file(s) score above {fail_above_val}")
        for total, s, p in bad[:10]:
            print(f"  {total:>5}  {p}")
        sys.exit(1)
    print(f"PASS: no file scores above {fail_above_val}")
PY
