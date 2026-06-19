#!/usr/bin/env python3
"""
audit-series-integrity.py — 시리즈 안 frontmatter 일관성·완전성 검증.

검사 항목:
  1. seriesOrder 빈 번호 (gap) — 1,2,3,_,5 같은
  2. 같은 series 이름 안에서 chapter 모두 같은 series 값
  3. draft 상태 *혼합* — 시리즈가 대부분 published인데 일부만 draft
  4. date 순서 — seriesOrder대로 정렬했을 때 date 역행
  5. 중복 seriesOrder
  6. 필수 필드 누락 (title, series, seriesOrder, date)

출력:
  텍스트 리포트. 시리즈 단위로 그룹화.

Exit code:
  0 = 통과
  1 = blocking 위반 (중복 seriesOrder·필수 필드 누락)
  2 = warning (gap·draft 혼합·date 역행)
"""

import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "src" / "content" / "blog"


def parse_frontmatter(text):
    """Frontmatter dict 추출. YAML 의존성 없이 간단한 line-by-line."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    fm = {}
    for line in text[3:end].splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            # 큰따옴표 제거
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.startswith("'") and val.endswith("'"):
                val = val[1:-1]
            fm[key] = val
    return fm


def collect_series():
    """series 이름 → [chapter_info, ...] 매핑."""
    series_map = defaultdict(list)
    for md in CONTENT_DIR.rglob("*.md"):
        if md.name in ("STORYBOARD.md", "README.md"):
            continue
        try:
            text = md.read_text(encoding="utf-8")
        except Exception:
            continue
        fm = parse_frontmatter(text)
        if "series" not in fm:
            continue
        series = fm["series"]
        try:
            order = int(fm.get("seriesOrder", "0"))
        except ValueError:
            order = 0
        info = {
            "path": str(md.relative_to(REPO_ROOT)),
            "order": order,
            "draft": fm.get("draft", "false").lower() == "true",
            "date": fm.get("date", ""),
            "title": fm.get("title", ""),
            "has_title": bool(fm.get("title")),
            "has_date": bool(fm.get("date")),
        }
        series_map[series].append(info)
    return series_map


def audit_series(name, chapters):
    """단일 시리즈의 일관성·완전성 audit."""
    issues = {"blocking": [], "warning": []}

    # 0. seriesOrder 정렬
    chapters_sorted = sorted(chapters, key=lambda c: c["order"])
    orders = [c["order"] for c in chapters_sorted if c["order"] > 0]

    # 1. 중복 seriesOrder
    seen_orders = defaultdict(list)
    for c in chapters:
        seen_orders[c["order"]].append(c["path"])
    for order, paths in seen_orders.items():
        if order > 0 and len(paths) > 1:
            issues["blocking"].append(
                f"중복 seriesOrder={order}: {', '.join(p.rsplit('/', 1)[-1] for p in paths)}"
            )

    # 2. seriesOrder 빈 번호 (gap)
    if orders:
        unique_orders = sorted(set(orders))
        expected = set(range(min(unique_orders), max(unique_orders) + 1))
        missing = expected - set(unique_orders)
        if missing:
            issues["warning"].append(
                f"seriesOrder gap: {sorted(missing)}"
            )

    # 3. 필수 필드 누락
    for c in chapters:
        if not c["has_title"]:
            issues["blocking"].append(f"title 누락: {c['path']}")
        if not c["has_date"]:
            issues["blocking"].append(f"date 누락: {c['path']}")
        if c["order"] == 0:
            issues["warning"].append(f"seriesOrder=0 또는 누락: {c['path']}")

    # 4. draft 상태 혼합 (소수파만)
    drafts = sum(1 for c in chapters if c["draft"])
    if drafts > 0 and drafts < len(chapters):
        # 어느 쪽이 소수인지 알리기
        if drafts <= len(chapters) // 2:
            issues["warning"].append(
                f"draft 혼합: {drafts}/{len(chapters)} draft (대부분 published)"
            )
        else:
            published = len(chapters) - drafts
            issues["warning"].append(
                f"draft 혼합: {published}/{len(chapters)} published (대부분 draft)"
            )

    # 5. date 역행 — seriesOrder대로 정렬했을 때 date가 *내림*이면 의도된 것 아닐 가능성
    prev_date = ""
    for c in chapters_sorted:
        if c["date"] and prev_date and c["date"] < prev_date:
            issues["warning"].append(
                f"date 역행: seriesOrder={c['order']} {c['date']} < 이전 {prev_date}"
            )
            break  # 한 번만
        if c["date"]:
            prev_date = c["date"]

    return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true",
                    help="warning도 exit 1 처리")
    ap.add_argument("--json", help="JSON 출력 경로")
    ap.add_argument("--quiet", action="store_true",
                    help="이슈 없는 시리즈는 출력 안 함")
    args = ap.parse_args()

    series_map = collect_series()

    total_series = 0
    total_chapters = 0
    blocking_count = 0
    warning_count = 0
    report = []

    for name, chapters in sorted(series_map.items()):
        total_series += 1
        total_chapters += len(chapters)
        issues = audit_series(name, chapters)
        nb = len(issues["blocking"])
        nw = len(issues["warning"])
        if nb == 0 and nw == 0:
            if not args.quiet:
                report.append({"series": name, "chapters": len(chapters), "issues": []})
            continue
        report.append({
            "series": name,
            "chapters": len(chapters),
            "blocking": issues["blocking"],
            "warning": issues["warning"],
        })
        blocking_count += nb
        warning_count += nw

    # 텍스트 리포트
    print("=== Series Integrity Audit ===")
    print(f"  Total series: {total_series}, chapters: {total_chapters}")
    print(f"  Blocking: {blocking_count}, Warning: {warning_count}")
    print()

    for r in report:
        if not r.get("blocking") and not r.get("warning"):
            print(f"✓ {r['series']} ({r['chapters']}편)")
            continue
        print(f"⚠ {r['series']} ({r['chapters']}편)")
        for b in r.get("blocking", []):
            print(f"    ✗ BLOCK: {b}")
        for w in r.get("warning", []):
            print(f"    ⚠ WARN:  {w}")
        print()

    if args.json:
        with open(args.json, "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

    if blocking_count > 0:
        sys.exit(1)
    if warning_count > 0 and args.strict:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
