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
import math
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
    # 1-pass: 각 챕터의 텍스트를 모아 두고, term별 문서빈도(df) 계산
    docs = []
    df = {t: 0 for t in terms}
    for md in CONTENT.rglob("*.md"):
        raw = md.read_text(encoding="utf-8", errors="ignore")
        m = FM.match(raw)
        if not m:
            continue
        fm, body = m.group(1), m.group(2).lower()
        d = {
            "path": md.relative_to(REPO_ROOT),
            "title_raw": field(fm, "title"),
            "title": field(fm, "title").lower(),
            "tags": field(fm, "tags").lower(),
            "desc": field(fm, "description").lower(),
            "body": body,
        }
        docs.append(d)
        for t in terms:
            if t in d["title"] or t in d["tags"] or t in d["desc"] or t in d["body"]:
                df[t] += 1

    n = len(docs) or 1
    # IDF: 흔한 단어(RISC-V 등)는 낮게, 희귀어(RVA23 등)는 높게. 최소 0.3로 클램프.
    idf = {t: max(0.3, math.log(n / (df[t] or 0.5))) for t in terms}

    results = []
    for d in docs:
        score = 0.0
        hits = []
        for t in terms:
            w = 0
            if t in d["title"]:
                w += 5
            if t in d["tags"]:
                w += 4
            if t in d["desc"]:
                w += 3
            if t in d["body"]:
                w += 1
            if w:
                score += w * idf[t]
                hits.append(t)
        if score:
            results.append((round(score, 1), d["path"], d["title_raw"], hits))
    results.sort(key=lambda r: -r[0])
    return results, df, n


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

    results, df, n = scan(terms)
    # 주제의 '정체성' = 가장 희귀한(=df 최소) 쿼리 단어. 그 단어를 다룬 챕터가
    # 없으면 새 주제로 본다. RISC-V 같은 흔한 단어가 겹치는 건 '관련'일 뿐.
    lterms = [t.lower() for t in terms]
    min_df = min(df[t] for t in lterms)
    identity = {t for t in lterms if df[t] == min_df}  # 최소 df 단어(들)

    print("=== Duplicate-Topic Check ===")
    print(f"  쿼리: {', '.join(terms)}   매칭 챕터: {len(results)}")
    print("  단어별 등장 챕터 수 (낮을수록 변별력↑):")
    for t in terms:
        mark = " ← 정체성 단어" if t.lower() in identity else ""
        print(f"    {t}: {df[t.lower()]}{mark}")

    def is_strong(score, hits):
        return score >= args.threshold and any(h in identity for h in hits)

    strong = [r for r in results if is_strong(r[0], r[3])]
    if results:
        print()
        for score, rel, title, hits in results[: args.top]:
            flag = "⚠ 강한 중복 후보" if is_strong(score, hits) else "  관련"
            print(f"  {flag}  [{score:6.1f}]  {title}")
            print(f"           {rel}  (매칭: {', '.join(hits)})")

    if strong:
        print(f"\n✗ {len(strong)}개 강한 중복 후보 — 새로 쓰기 전 위 챕터 확인 권장.")
        return 1
    if min_df == 0:
        print(f"\n✓ 정체성 단어({'·'.join(identity)})를 다룬 챕터 없음 → 새 주제. "
              f"(위 '관련' 챕터엔 교차링크 고려)")
    else:
        print("\n✓ 정체성 단어 기준 강한 중복 없음 — 진행 가능 (관련 챕터는 교차링크).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
