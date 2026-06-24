#!/usr/bin/env python3
"""
check-duplicate-topic.py — 새 챕터 쓰기 *전에* 같은 주제가 이미 있는지 검사.

이번 세션 교훈: PREEMPT_RT 챕터를 새로 쓸 뻔했는데 *이미 part5-07에 존재*했다.
기억에 의존하면 중복을 만든다. 쓰기 전에 이 도구로 기존 커버리지를 확인한다.

키워드(또는 제안 제목)를 받아 모든 챕터의 frontmatter(title·tags·description)와
본문에서 매칭을 찾아 *겹치는 기존 챕터*를 점수순으로 보여 준다.

가중치: title 5 · tags 4 · description 3 · body 1(존재 여부만).

Usage:
  check-duplicate-topic.py PREEMPT_RT real-time
  check-duplicate-topic.py --title "PREEMPT_RT Linux mainline"
  check-duplicate-topic.py UALink --threshold 4

Exit: 0 = 강한 중복 없음, 1 = 임계 이상 후보 있음(확인 권장).
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = REPO_ROOT / "src" / "content" / "blog"

FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def field(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.MULTILINE)
    return m.group(1).strip().strip('"') if m else ""


def scan(query_terms):
    terms = [t.lower() for t in query_terms if t.strip()]
    results = []
    for md in CONTENT.rglob("*.md"):
        raw = md.read_text(encoding="utf-8", errors="ignore")
        m = FM.match(raw)
        if not m:
            continue
        fm, body = m.group(1), m.group(2).lower()
        title = field(fm, "title").lower()
        tags = field(fm, "tags").lower()
        desc = field(fm, "description").lower()
        score = 0
        hits = []
        for t in terms:
            w = 0
            if t in title:
                w += 5
            if t in tags:
                w += 4
            if t in desc:
                w += 3
            if t in body:
                w += 1
            if w:
                score += w
                hits.append(t)
        if score:
            results.append((score, md.relative_to(REPO_ROOT), field(fm, "title"), hits))
    results.sort(key=lambda r: -r[0])
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="*", help="주제 키워드들")
    ap.add_argument("--title", default="", help="제안 제목 (단어로 분해해 검색)")
    ap.add_argument("--threshold", type=int, default=8,
                    help="이 점수 이상이면 '강한 중복 후보'로 경고 (기본 8)")
    ap.add_argument("--top", type=int, default=10)
    args = ap.parse_args()

    terms = list(args.terms)
    if args.title:
        terms += [w for w in re.split(r"[\s\-_/]+", args.title) if len(w) > 2]
    if not terms:
        ap.error("키워드나 --title 중 하나는 필요합니다")

    results = scan(terms)
    print("=== Duplicate-Topic Check ===")
    print(f"  쿼리: {', '.join(terms)}   매칭 챕터: {len(results)}")
    if not results:
        print("  ✓ 겹치는 챕터 없음 — 새 주제로 보입니다.")
        return 0

    strong = [r for r in results if r[0] >= args.threshold]
    print()
    for score, rel, title, hits in results[: args.top]:
        flag = "⚠ 강한 중복 후보" if score >= args.threshold else "  관련"
        print(f"  {flag}  [{score:2d}]  {title}")
        print(f"           {rel}  (매칭: {', '.join(hits)})")

    if strong:
        print(f"\n✗ {len(strong)}개 강한 중복 후보 — 새로 쓰기 전 위 챕터 확인 권장.")
        return 1
    print("\n✓ 강한 중복 없음 (약한 관련만) — 진행 가능, 교차링크 고려.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
