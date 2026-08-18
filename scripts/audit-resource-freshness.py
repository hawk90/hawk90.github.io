#!/usr/bin/env python3
"""Find external resources due for human/web review.

This does not scrape or auto-approve recommendations.  It keeps the recurring
search work visible: due resources become candidates for a fresh web search,
then a reviewer updates last_reviewed and the roadmap manually.
"""

import argparse
import json
import re
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FILE = REPO_ROOT / "data" / "resource-tracking.yaml"


def load_resources(path):
    items, current = [], None
    for line in path.read_text(encoding="utf-8").splitlines():
        if re.match(r"^\s*- id:\s*", line):
            if current:
                items.append(current)
            current = {"id": line.split(":", 1)[1].strip()}
            continue
        if current is None:
            continue
        match = re.match(r"^\s{4}([a-z_]+):\s*(.*)$", line)
        if match:
            key, value = match.groups()
            current[key] = value.strip().strip('"\'')
    if current:
        items.append(current)
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=str(DEFAULT_FILE))
    ap.add_argument("--as-of", help="기준일 YYYY-MM-DD")
    ap.add_argument("--json")
    args = ap.parse_args()
    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    resources = load_resources(Path(args.file))
    due, fresh, invalid = [], [], []
    for item in resources:
        try:
            reviewed = date.fromisoformat(item["last_reviewed"])
            cadence = int(item["cadence_days"])
            due_date = reviewed + timedelta(days=cadence)
        except (KeyError, ValueError):
            invalid.append(item)
            continue
        row = {**item, "due": due_date.isoformat(), "daysOverdue": (as_of - due_date).days}
        (due if as_of > due_date else fresh).append(row)

    print("=== Resource Freshness Audit ===")
    print(f"  기준일: {as_of.isoformat()}  total={len(resources)} fresh={len(fresh)} due={len(due)} invalid={len(invalid)}")
    if due:
        print("\n--- web search/review queue ---")
        for item in due:
            print(f"  [{item.get('topic', 'unassigned')}] {item['id']} — {item.get('url', '')} ({item['daysOverdue']} days overdue)")
    if invalid:
        print("\n--- invalid inventory entries ---")
        for item in invalid:
            print(f"  {item.get('id', '(unknown)')}")
    if args.json:
        output = Path(args.json)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps({"asOf": as_of.isoformat(), "fresh": fresh, "due": due, "invalid": invalid}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 1 if due or invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
