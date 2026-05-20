#!/usr/bin/env python3
"""detect-text-overlap.py — render TikZ files to PDF and report TEXT bounding-box overlaps.

This is the *reliable* detector. The heuristic in detect-tikz-overlap.sh
ranks by source-code patterns; this script ranks by actual rendered text
positions extracted with `pdftotext -bbox`.

Pipeline per .tex:
  1. Build PDF via pdflatex/xelatex (cached: skip if PDF newer than .tex)
  2. Run `pdftotext -bbox file.pdf -` → parse <word xMin xMax yMin yMax>
  3. Detect overlapping/touching word boxes
  4. Score file by (number of overlap pairs) and (max intersection area)

Output: ranked list to stdout + /tmp/text-overlap-report.txt
Files at the top of the list have multiple text words rendering on top
of (or millimetres from) one another — almost always a real readability bug.

Strict mode (`--strict`):
  - Tighter MARGIN (1.5pt → ~0.53mm visible breathing space)
  - Counts "near-miss" pairs within NEAR (3pt)
  - Exits with non-zero code if any strict-overlap / near-miss is found
  - Designed for CI use

Usage:
  scripts/detect-text-overlap.py                # full repo
  scripts/detect-text-overlap.py --series uml   # one series
  scripts/detect-text-overlap.py --limit 60     # show top N
  scripts/detect-text-overlap.py --force        # rebuild PDFs even if cached
  scripts/detect-text-overlap.py --strict       # CI-mode (exit non-zero on issues)
  scripts/detect-text-overlap.py --margin 1.5   # custom touching margin in pt
"""
import argparse
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIAG_ROOT = ROOT / "public/images/blog"
REPORT = Path("/tmp/text-overlap-report.txt")

WORD_RE = re.compile(
    r'<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">'
    r'([^<]*)</word>'
)

# Strictness tiers (pt; 1 pt ≈ 0.353 mm)
# - LOOSE margin (default): two words this close are likely fine visually
# - STRICT margin (--strict): tighter — pairs within this are flagged
# - NEAR threshold: distance for "near-miss" (close but not overlapping)
DEFAULT_MARGIN = 0.5    # pt (~0.18mm) — touching signal
STRICT_MARGIN = 1.5     # pt (~0.53mm) — visible breathing space required
NEAR_MARGIN = 3.0       # pt (~1.06mm) — uncomfortably close


def needs_xelatex(tex: Path) -> bool:
    text = tex.read_text(encoding="utf-8", errors="ignore")
    if "fontspec" in text:
        return True
    return any(0xAC00 <= ord(c) <= 0xD7A3 for c in text)


def build_pdf(tex: Path, force: bool) -> Path | None:
    """Compile .tex → .pdf in a sibling directory. Returns PDF path or None."""
    pdf = tex.with_suffix(".pdf")
    if not force and pdf.exists() and pdf.stat().st_mtime > tex.stat().st_mtime:
        return pdf

    engine = "xelatex" if needs_xelatex(tex) else "pdflatex"
    try:
        subprocess.run(
            [engine, "-interaction=nonstopmode", "-halt-on-error", tex.name],
            cwd=tex.parent,
            capture_output=True,
            timeout=60,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return None
    # Clean aux/log immediately to avoid clutter
    for ext in (".aux", ".log"):
        aux = tex.with_suffix(ext)
        if aux.exists():
            aux.unlink()
    return pdf if pdf.exists() else None


def extract_words(pdf: Path) -> list[tuple[float, float, float, float, str]]:
    """Return list of (xMin, yMin, xMax, yMax, text)."""
    try:
        out = subprocess.check_output(
            ["pdftotext", "-bbox", str(pdf), "-"], timeout=10
        ).decode("utf-8", errors="ignore")
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return []
    return [
        (float(a), float(b), float(c), float(d), text)
        for a, b, c, d, text in WORD_RE.findall(out)
    ]


def overlap_area(a, b) -> float:
    """Rectangle-rectangle intersection area in pt²."""
    x0 = max(a[0], b[0])
    y0 = max(a[1], b[1])
    x1 = min(a[2], b[2])
    y1 = min(a[3], b[3])
    if x1 <= x0 or y1 <= y0:
        return 0.0
    return (x1 - x0) * (y1 - y0)


def gap(a, b) -> float:
    """Minimum gap between two rectangles in pt. 0 if they overlap or touch."""
    dx = max(0.0, max(a[0], b[0]) - min(a[2], b[2]))
    dy = max(0.0, max(a[1], b[1]) - min(a[3], b[3]))
    if dx == 0 and dy == 0:
        return 0.0
    if dx == 0:
        return dy
    if dy == 0:
        return dx
    return (dx * dx + dy * dy) ** 0.5


def proximity_score(a, b, margin: float, near: float):
    """Return (overlap_area, touching, near).

    overlap_area: pt² of strict intersection
    touching: 1 if boxes are within `margin` pt of each other (no overlap)
    near: 1 if boxes are within `near` pt (no overlap, beyond margin)
    """
    area = overlap_area(a, b)
    if area > 0:
        return area, 0, 0
    g = gap(a, b)
    if g <= margin:
        return 0.0, 1, 0
    if g <= near:
        return 0.0, 0, 1
    return 0.0, 0, 0


def score_words(words, margin: float, near: float) -> dict:
    """Compute overlap statistics for a list of word bboxes."""
    n = len(words)
    if n < 2:
        return {"overlap_pairs": 0, "touching_pairs": 0, "near_pairs": 0,
                "total_area": 0.0, "max_area": 0.0, "n_words": n}

    overlap_pairs = 0
    touching_pairs = 0
    near_pairs = 0
    total_area = 0.0
    max_area = 0.0
    for i in range(n):
        ai = words[i][:4]
        for j in range(i + 1, n):
            bj = words[j][:4]
            area, touch, near_hit = proximity_score(ai, bj, margin, near)
            if area > 0:
                overlap_pairs += 1
                total_area += area
                max_area = max(max_area, area)
            elif touch:
                touching_pairs += 1
            elif near_hit:
                near_pairs += 1
    return {
        "overlap_pairs": overlap_pairs,
        "touching_pairs": touching_pairs,
        "near_pairs": near_pairs,
        "total_area": total_area,
        "max_area": max_area,
        "n_words": n,
    }


def cleanup_pdf(pdf: Path) -> None:
    if pdf.exists():
        pdf.unlink()


def process_one(tex: Path, force: bool, keep_pdf: bool, margin: float, near: float):
    pdf = build_pdf(tex, force)
    if pdf is None:
        return tex, None, "build_failed"
    words = extract_words(pdf)
    stats = score_words(words, margin, near)
    if not keep_pdf:
        cleanup_pdf(pdf)
    return tex, stats, None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--series", help="Only this top-level series (e.g. uml)")
    p.add_argument("--limit", type=int, default=40)
    p.add_argument("--force", action="store_true",
                   help="Rebuild PDFs even if cached")
    p.add_argument("--keep-pdf", action="store_true",
                   help="Don't remove intermediate PDFs (faster on re-run)")
    p.add_argument("--jobs", type=int, default=4)
    p.add_argument("--strict", action="store_true",
                   help="CI mode: tighter margin, count near-misses, exit non-zero on issues")
    p.add_argument("--margin", type=float, default=None,
                   help=f"Touching margin in pt (default loose={DEFAULT_MARGIN}, strict={STRICT_MARGIN})")
    p.add_argument("--near", type=float, default=NEAR_MARGIN,
                   help=f"Near-miss threshold in pt (default {NEAR_MARGIN})")
    p.add_argument("--max-overlap", type=int, default=0,
                   help="Strict mode: max allowed overlap_pairs per file (default 0)")
    p.add_argument("--max-touching", type=int, default=0,
                   help="Strict mode: max allowed touching_pairs per file (default 0)")
    p.add_argument("--max-near", type=int, default=999_999,
                   help="Strict mode: max allowed near_pairs per file (default unlimited; near is informational)")
    args = p.parse_args()

    # Determine margin
    if args.margin is not None:
        margin = args.margin
    elif args.strict:
        margin = STRICT_MARGIN
    else:
        margin = DEFAULT_MARGIN

    tex_files = sorted(DIAG_ROOT.rglob("*.tex"))
    tex_files = [t for t in tex_files if not t.name.startswith("_")]
    if args.series:
        tex_files = [t for t in tex_files if t.parts[len(DIAG_ROOT.parts)] == args.series]
    print(
        f"Scanning {len(tex_files)} files (jobs={args.jobs}, margin={margin}pt, "
        f"near={args.near}pt, strict={args.strict})...",
        file=sys.stderr,
    )

    rows = []
    failed = []
    with ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futures = {
            ex.submit(process_one, t, args.force, args.keep_pdf, margin, args.near): t
            for t in tex_files
        }
        done = 0
        for fut in as_completed(futures):
            done += 1
            tex, stats, err = fut.result()
            if err:
                failed.append(tex)
                continue
            rel = tex.relative_to(DIAG_ROOT)
            rows.append((stats, str(rel)))
            if done % 25 == 0:
                print(f"  {done}/{len(tex_files)}", file=sys.stderr)

    def sort_key(r):
        s = r[0]
        # Stronger penalties when scoring; max_area now weighted too
        return -(
            s["overlap_pairs"] * 100
            + s["max_area"] * 10
            + s["total_area"] * 5
            + s["touching_pairs"] * 2
            + s["near_pairs"]
        )

    rows.sort(key=sort_key)

    header = (
        f"{'#':>4}  {'olap':>4} {'touch':>5} {'near':>4} "
        f"{'maxA':>6} {'totA':>8} {'words':>5}  file"
    )
    lines = [header, "-" * len(header)]
    for i, (s, path) in enumerate(rows, 1):
        lines.append(
            f"{i:>4}  {s['overlap_pairs']:>4} {s['touching_pairs']:>5} "
            f"{s['near_pairs']:>4} "
            f"{s['max_area']:>6.2f} {s['total_area']:>8.2f} "
            f"{s['n_words']:>5}  {path}"
        )
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")

    show = lines[: args.limit + 2] if args.limit else lines
    print("\n".join(show))
    print(f"\nTotal: {len(rows)}   Build failed: {len(failed)}")
    print(f"Full report: {REPORT}")
    if failed:
        print("\nBuild failures:")
        for t in failed[:10]:
            print(f"  {t.relative_to(DIAG_ROOT)}")

    if args.strict:
        offenders = [
            (s, p) for (s, p) in rows
            if s["overlap_pairs"] > args.max_overlap
            or s["touching_pairs"] > args.max_touching
            or s["near_pairs"] > args.max_near
        ]
        if offenders:
            print(f"\nSTRICT mode: {len(offenders)} file(s) exceed thresholds "
                  f"(overlap>{args.max_overlap}, touching>{args.max_touching}, "
                  f"near>{args.max_near})")
            for s, p in offenders[:20]:
                print(f"  olap={s['overlap_pairs']} touch={s['touching_pairs']} "
                      f"near={s['near_pairs']}  {p}")
            sys.exit(1)
        if failed:
            print(f"\nSTRICT mode: {len(failed)} file(s) failed to build")
            sys.exit(2)
        print("\nSTRICT mode: PASS")


if __name__ == "__main__":
    main()
