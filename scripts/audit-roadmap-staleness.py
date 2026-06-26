#!/usr/bin/env python3
"""
audit-roadmap-staleness.py — known-facts.yaml의 *_roadmap 항목 신선도 점검.

이번 세션이 드러낸 유일한 반복 리스크: roadmap에 둔 제품이 *출시됐는데도*
verified로 안 옮겨져 본문이 "예정"으로 남는 것(B300·Jetson Thor가 그랬음).

각 roadmap 항목 주석에 `review:YYYY-Qn`(또는 `YYYY-MM`·`YYYY-MM-DD`)을 달아
두면, 그 시점이 지났을 때 "출시 여부 확인 후 verified로 이동" 경고를 낸다.

주석 형식:
  - Vera Rubin   # review:2026-Q4 ...설명...

규칙:
  - review:YYYY-Qn  → 분기 말일(Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31)
  - review:YYYY-MM  → 그 달 말일
  - review:YYYY-MM-DD → 그 날짜
  - review 토큰이 없는 roadmap 항목 → "리뷰 날짜 미설정" 경고

Usage:
  audit-roadmap-staleness.py                # 오늘 기준 점검
  audit-roadmap-staleness.py --as-of 2027-01-01   # 가상 날짜로 점검(테스트)

Exit: 0 = 신선, 1 = 기한 지난 항목 있음(확인 필요).
"""

import argparse
import calendar
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FACTS = REPO_ROOT / "data" / "known-facts.yaml"

SECTION = re.compile(r"^([A-Za-z0-9_]+):")
ITEM = re.compile(r"^\s*-\s*(.+?)\s*(?:#\s*(.*))?$")
REVIEW = re.compile(r"review:(\d{4})-(Q[1-4]|\d{2})(?:-(\d{2}))?", re.IGNORECASE)
QUARTER_END = {"Q1": (3, 31), "Q2": (6, 30), "Q3": (9, 30), "Q4": (12, 31)}


def due_date(y, mid, dd):
    """review 토큰 → 마감일(date)."""
    y = int(y)
    if mid.upper().startswith("Q"):
        mo, day = QUARTER_END[mid.upper()]
        return date(y, mo, day)
    mo = int(mid)
    if dd:
        return date(y, mo, int(dd))
    return date(y, mo, calendar.monthrange(y, mo)[1])  # 그 달 말일


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--as-of", help="기준일 YYYY-MM-DD (기본=오늘)")
    args = ap.parse_args()
    today = date.fromisoformat(args.as_of) if args.as_of else date.today()

    if not FACTS.is_file():
        print(f"✗ {FACTS} 없음")
        return 2

    section = ""
    stale, undated, ok = [], [], 0
    for raw in FACTS.read_text(encoding="utf-8").split("\n"):
        ms = SECTION.match(raw)
        if ms:
            section = ms.group(1)
            continue
        if not section.endswith("_roadmap"):
            continue
        mi = ITEM.match(raw)
        if not mi or mi.group(1).strip() in ("", "[]"):
            continue
        name = mi.group(1).strip()
        comment = mi.group(2) or ""
        mr = REVIEW.search(comment)
        if not mr:
            undated.append((section, name))
            continue
        d = due_date(*mr.groups())
        if today > d:
            stale.append((section, name, d))
        else:
            ok += 1

    print("=== Roadmap Staleness Audit ===")
    print(f"  기준일: {today.isoformat()}   신선: {ok}  기한지남: {len(stale)}  "
          f"리뷰날짜 미설정: {len(undated)}")
    if stale:
        print("\n--- ⚠ 기한 지남 — 출시 여부 확인 후 verified로 이동 ---")
        for sec, name, d in stale:
            print(f"  [{sec}] {name}  (review:{d.isoformat()} 경과)")
    if undated:
        print("\n--- ℹ review 날짜 미설정 (주석에 `review:YYYY-Qn` 추가 권장) ---")
        for sec, name in undated:
            print(f"  [{sec}] {name}")

    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
