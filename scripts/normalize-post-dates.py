#!/usr/bin/env python3
"""normalize-post-dates.py — assign unique, sequential dates per series.

Rule (matches CLAUDE.md and existing convention):
  - For each series, sort posts by seriesOrder.
  - Use the earliest existing date in the series as the base date.
  - Post i (0-based) gets time T(HH):00:00 where HH = (i+1) % 24,
    and day offset = (i+1) // 24.
  - Posts without `series` or without `seriesOrder` are left untouched.

Idempotent: a series already on T01:00:00, T02:00:00, ... will get the
same dates back.

Usage:
  scripts/normalize-post-dates.py              # apply changes
  scripts/normalize-post-dates.py --dry-run    # preview only
"""
import argparse
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "src/content/blog"

DATE_RE = re.compile(r"^date:\s*(\S+)\s*$", re.MULTILINE)
SERIES_RE = re.compile(r'^series:\s*"([^"]+)"\s*$', re.MULTILINE)
ORDER_RE = re.compile(r"^seriesOrder:\s*([\d.]+)\s*$", re.MULTILINE)


def parse_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return None
    return m.group(1)


def parse_date(raw: str) -> date:
    # Extract just the YYYY-MM-DD portion; ignore time even if it has
    # invalid hours like T25:00:00 (some legacy posts have those).
    day = raw.split("T", 1)[0]
    return date.fromisoformat(day)


def format_new(base_day: date, offset: int) -> str:
    """offset = i+1, where i is 0-based position in series."""
    hour = offset % 24
    days = offset // 24
    new_date = base_day + timedelta(days=days)
    return f"{new_date.isoformat()}T{hour:02d}:00:00"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    posts = []
    for md in sorted(BLOG.rglob("*.md")):
        text = md.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if fm is None:
            continue
        d_match = DATE_RE.search(fm)
        s_match = SERIES_RE.search(fm)
        o_match = ORDER_RE.search(fm)
        if not (d_match and s_match and o_match):
            continue
        posts.append({
            "path": md,
            "text": text,
            "date_raw": d_match.group(1),
            "date": parse_date(d_match.group(1)),
            "series": s_match.group(1),
            "order": float(o_match.group(1)),
        })

    # Group by series
    groups = defaultdict(list)
    for p in posts:
        groups[p["series"]].append(p)

    changes = 0
    series_changed = 0
    for series, members in groups.items():
        if len(members) < 2:
            continue
        members.sort(key=lambda p: p["order"])
        base_day = min(p["date"] for p in members)

        series_modified = False
        for i, m in enumerate(members):
            new_date_str = format_new(base_day, i + 1)
            if m["date_raw"] == new_date_str:
                continue
            new_text = m["text"].replace(
                f"date: {m['date_raw']}",
                f"date: {new_date_str}",
                1,
            )
            if not args.dry_run:
                m["path"].write_text(new_text, encoding="utf-8")
            print(f"  {m['date_raw']:>25s} → {new_date_str}  {m['path'].relative_to(BLOG)}")
            changes += 1
            series_modified = True
        if series_modified:
            series_changed += 1

    print()
    print(f"Series scanned: {len(groups)}")
    print(f"Series modified: {series_changed}")
    print(f"Posts updated: {changes}")
    if args.dry_run:
        print("(dry run — no files written)")


if __name__ == "__main__":
    main()
