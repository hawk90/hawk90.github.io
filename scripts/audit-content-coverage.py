#!/usr/bin/env python3
"""Audit published/draft coverage across the content tree.

This deliberately counts draft files too.  A roadmap must distinguish
"not written" from "written but not published"; counting only rendered posts
made the algorithm and writing tracks look empty.

Usage:
  python3 scripts/audit-content-coverage.py
  python3 scripts/audit-content-coverage.py --json reports/content-readiness/coverage.json
  python3 scripts/audit-content-coverage.py --include-non-blog
"""

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROOT = REPO_ROOT / "src" / "content" / "blog"


def frontmatter(text):
    if not text.startswith("---"):
        return ""
    parts = text.split("---", 2)
    return parts[1] if len(parts) == 3 else ""


def value(block, key):
    match = re.search(rf"^{re.escape(key)}:\s*(.*)$", block, re.MULTILINE)
    return match.group(1).strip().strip('"\'') if match else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(DEFAULT_ROOT), help="content root")
    ap.add_argument("--json", help="write JSON report")
    ap.add_argument("--include-non-blog", action="store_true", help="also count markdown outside the blog root")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = sorted(root.rglob("*.md"))
    rows = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        block = frontmatter(text)
        is_draft = value(block, "draft").lower() == "true"
        series = value(block, "series") or "(unassigned)"
        rel = path.relative_to(REPO_ROOT)
        rows.append({
            "path": str(rel),
            "status": "draft" if is_draft else "published",
            "series": series,
            "domain": rel.parts[3] if len(rel.parts) > 3 and rel.parts[:3] == ("src", "content", "blog") else rel.parts[0],
        })

    by_domain = defaultdict(Counter)
    by_series = defaultdict(Counter)
    for row in rows:
        by_domain[row["domain"]][row["status"]] += 1
        by_domain[row["domain"]]["all"] += 1
        by_series[row["series"]][row["status"]] += 1
        by_series[row["series"]]["all"] += 1

    draft_only = [
        {"series": series, **counts}
        for series, counts in sorted(by_series.items())
        if counts["draft"] and not counts["published"]
    ]
    report = {
        "root": str(root.relative_to(REPO_ROOT)),
        "includeNonBlog": args.include_non_blog,
        "totalFiles": len(rows),
        "domains": {k: dict(v) for k, v in sorted(by_domain.items())},
        "series": {k: dict(v) for k, v in sorted(by_series.items())},
        "draftOnlySeries": draft_only,
    }

    print("=== Content Coverage Audit ===")
    print(f"  files: {len(rows)}  draft-only series: {len(draft_only)}")
    print("\n--- domains ---")
    for domain, counts in sorted(by_domain.items()):
        print(f"  {domain:16} all={counts['all']:4} published={counts['published']:4} draft={counts['draft']:4}")
    if draft_only:
        print("\n--- draft-only series ---")
        for item in draft_only:
            print(f"  {item['series']} ({item['draft']} draft)")

    if args.json:
        output = Path(args.json)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
