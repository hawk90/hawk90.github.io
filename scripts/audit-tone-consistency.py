#!/usr/bin/env python3
"""
audit-tone-consistency.py — 한국어 문체(톤) 일관성 검사.

CLAUDE.md §1: 한 글 안에서 '~합니다'(Tone A)와 '~다'(Tone B)를 섞지 않는다.
한 시리즈 안에서는 한 톤만 쓴다. 지금까지 *수동 체크리스트*였던 걸 자동화한다.

분류(문장 종결어미 기준):
  Tone A = '…니다.' 형 (합니다·입니다·됩니다·습니다…)  ※ '아니다'는 제외
  Tone B = 그 외 '…다.' 평어 (한다·이다·된다·있다·했다…)

코드펜스(```)·표 행(|)·헤딩(#)은 산문이 아니므로 제외한다.

검사:
  1) MIXED   — 한 챕터에 두 톤이 유의미하게 섞임 (소수 톤 ≥3 & 비율 ≥15%)
  2) OUTLIER — 챕터의 지배 톤이 *시리즈 다수 톤*과 다름

Usage:
  audit-tone-consistency.py [path...]        # 기본 = 전체
  audit-tone-consistency.py --min 8          # 판정 최소 문장 수
  audit-tone-consistency.py --show mixed|outlier|all

Exit: 0 = MIXED 없음, 1 = MIXED 있음.
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = REPO_ROOT / "src" / "content" / "blog"

FENCE = re.compile(r"^\s*```")
DA = re.compile(r"([가-힣])다[.!?…]")        # 종결 '…X다.'  (X = 직전 음절)
NIDA = re.compile(r"니다[.!?…]")             # '…니다.'  (Tone A: 합니다·입니다)
ANIDA = re.compile(r"아니다[.!?…]")          # 예외: '아니다'는 Tone B
SIDA = re.compile(r"시다[.!?…]")             # 청유형 '…ㅂ시다.' (봅시다·합시다) = Tone A, B로 세지 않음


def field(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.MULTILINE)
    return m.group(1).strip().strip('"') if m else ""


def prose_of(raw):
    """frontmatter·코드펜스·표·헤딩 제거한 산문 텍스트."""
    m = re.match(r"^---\s*\n.*?\n---\s*\n(.*)$", raw, re.DOTALL)
    body = m.group(1) if m else raw
    out, in_fence = [], False
    for line in body.split("\n"):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        s = line.lstrip()
        if s.startswith("|") or s.startswith("#"):
            continue
        out.append(line)
    return "\n".join(out)


QUOTED = re.compile(r'"[^"]*"|“[^”]*”|\'[^\']*\'|‘[^’]*’')  # 인용 예문 (문법책 등)


def count_tones(text):
    text = QUOTED.sub("", text)  # 따옴표 안 예문은 톤 집계에서 제외
    a = len(NIDA.findall(text)) - len(ANIDA.findall(text))
    # B = 전체 '…X다.' 에서 니다(A) 제외, 아니다 가산, 청유형 시다 제외
    b = (len(DA.findall(text)) - len(NIDA.findall(text))
         + len(ANIDA.findall(text)) - len(SIDA.findall(text)))
    return max(a, 0), max(b, 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--min", type=int, default=8, help="판정 최소 문장 수")
    ap.add_argument("--ratio", type=float, default=0.15, help="MIXED 소수톤 비율 임계")
    ap.add_argument("--show", choices=["mixed", "outlier", "all"], default="all")
    args = ap.parse_args()

    targets = args.paths or [str(CONTENT)]
    files = []
    for t in targets:
        p = Path(t)
        p = p if p.is_absolute() else REPO_ROOT / p
        if p.is_file() and p.suffix == ".md":
            files.append(p)
        elif p.is_dir():
            files.extend(p.rglob("*.md"))

    chapters = []      # (path, series, toneA, toneB, dominant, mixed)
    by_series = defaultdict(list)
    for md in files:
        raw = md.read_text(encoding="utf-8", errors="ignore")
        a, b = count_tones(prose_of(raw))
        total = a + b
        if total < args.min:
            continue
        dom = "A" if a >= b else "B"
        minority = min(a, b)
        mixed = minority >= 3 and minority / total >= args.ratio
        series = field(re.match(r"^---\s*\n(.*?)\n---", raw, re.DOTALL).group(1)
                       if raw.startswith("---") else "", "series")
        rel = md.relative_to(REPO_ROOT)
        rec = (rel, series, a, b, dom, mixed)
        chapters.append(rec)
        if series:
            by_series[series].append(rec)

    mixed = [c for c in chapters if c[5]]

    # 시리즈 다수 톤 대비 outlier
    outliers = []
    for series, recs in by_series.items():
        if len(recs) < 3:
            continue
        votes = defaultdict(int)
        for r in recs:
            votes[r[4]] += 1
        majority = "A" if votes["A"] >= votes["B"] else "B"
        if votes[majority] == len(recs):
            continue  # 만장일치
        for r in recs:
            if r[4] != majority and not r[5]:
                outliers.append((r, majority, votes))

    print("=== Tone Consistency Audit ===")
    print(f"  검사 챕터: {len(chapters)}   MIXED: {len(mixed)}   OUTLIER: {len(outliers)}")

    if args.show in ("mixed", "all") and mixed:
        print("\n--- ⚠ MIXED (한 챕터에 두 톤 혼용) ---")
        for rel, series, a, b, dom, _ in sorted(mixed):
            print(f"  {rel}  (A:{a} B:{b})  [{series}]")

    if args.show in ("outlier", "all") and outliers:
        print("\n--- ℹ OUTLIER (시리즈 다수 톤과 다름) ---")
        for (rel, series, a, b, dom, _), maj, votes in sorted(outliers, key=lambda x: str(x[0][0])):
            print(f"  {rel}  이 챕터=Tone {dom} (A:{a} B:{b}) ↔ 시리즈 다수=Tone {maj}  [{series}]")

    if not mixed and not outliers:
        print("  ✓ 톤 혼용·이탈 없음.")
    return 1 if mixed else 0


if __name__ == "__main__":
    sys.exit(main())
