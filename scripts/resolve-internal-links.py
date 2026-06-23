#!/usr/bin/env python3
"""
resolve-internal-links.py — broken /blog/... 페이지 링크를 자동 복구.

audit-internal-links.py가 broken으로 잡는 page link를 *기계적으로 안전한* 규칙으로
복구한다. 세 패스를 한 도구에 통합 (중복 스크립트 금지):

  pass1 REMAP   — 같은 dir + 같은 chapter 번호 = 1개 / 중복 세그먼트 제거 / 전역 유일 basename
  pass2 SERIES  — bare 시리즈 링크인데 시리즈가 존재 → 그 시리즈 첫 챕터로 remap
  pass3 STRIP   — 후보 전무 → markdown 링크를 평문(anchor text)으로 strip
                  (기존 strip-dead-links.mjs 의 죽은-링크 처리와 동일 철학)

AMBIG(후보 여러 개)는 절대 자동 변경하지 않고 리포트만 한다.

Usage:
  resolve-internal-links.py                       # 전체 dry-run 리포트
  resolve-internal-links.py --area embedded/bsp   # 범위 한정
  resolve-internal-links.py --apply               # pass1+2+3 적용
  resolve-internal-links.py --apply --no-strip    # remap만, strip 보류
  resolve-internal-links.py --show AMBIG          # 수동 검토 대상만

Exit: 0 = 적용/리포트 정상, 1 = (dry-run 시) 미해결 broken 존재.
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "src" / "content" / "blog"

TEXT_LINK = re.compile(r"(?<!\!)\[([^\]]*)\]\((/blog/[^)\s]+)\)")
NUM_PREFIX = re.compile(r"^(chapter|ch|item|lesson|rule|reminder|unit|day|week)(\d+)")
NUM_ANY = re.compile(r"(chapter|ch|item|lesson|rule|reminder|unit|day|week)(\d+)")


def slug_of(md: Path) -> str:
    rel = md.relative_to(CONTENT_DIR).as_posix()
    rel = re.sub(r"\.md$", "", rel)
    rel = re.sub(r"/index$", "", rel)
    return "/blog/" + rel


def build_index():
    slugs = set()
    by_dir_num = defaultdict(list)   # (dir, kind, num) -> [slug]
    by_basename = defaultdict(list)  # basename -> [slug]
    children = defaultdict(list)     # series-dir prefix -> [child slug]
    for md in CONTENT_DIR.rglob("*.md"):
        s = slug_of(md)
        slugs.add(s)
        parts = s.split("/")
        d = "/".join(parts[:-1])
        base = parts[-1]
        by_basename[base].append(s)
        children[d].append(s)
        m = NUM_PREFIX.match(base)
        if m:
            by_dir_num[(d, m.group(1), int(m.group(2)))].append(s)
    return slugs, by_dir_num, by_basename, children


def dedup_segments(base: str):
    toks = base.split("-")
    cands = set()
    n = len(toks)
    for size in range(1, n // 2 + 1):
        for i in range(0, n - 2 * size + 1):
            if toks[i:i + size] == toks[i + size:i + 2 * size]:
                cands.add("-".join(toks[:i + size] + toks[i + 2 * size:]))
    return cands


def first_chapter(prefix, children):
    kids = children.get(prefix, [])
    if not kids:
        return None
    def key(s):
        m = NUM_ANY.search(s.split("/")[-1])
        return (0, int(m.group(2))) if m else (1, s)
    return sorted(kids, key=key)[0]


def resolve(url, idx, allow_strip):
    """broken url -> (level, suggestion|None, note). level in OK/REMAP/SERIES/STRIP/AMBIG/NONE."""
    slugs, by_dir_num, by_basename, children = idx
    path = url.split("#", 1)[0].rstrip("/")
    if path in slugs:
        return ("OK", path, "")
    parts = path.split("/")
    base = parts[-1]
    d = "/".join(parts[:-1])

    # pass1a: 중복 세그먼트 제거
    for cand in dedup_segments(base):
        if f"{d}/{cand}" in slugs:
            return ("REMAP", f"{d}/{cand}", "dedup")

    # pass1b: 같은 dir + 같은 chapter 번호
    m = NUM_PREFIX.match(base)
    if m:
        hits = by_dir_num.get((d, m.group(1), int(m.group(2))), [])
        if len(hits) == 1:
            return ("REMAP", hits[0], "same-dir chapnum")
        if len(hits) > 1:
            return ("AMBIG", None, f"chapnum->{len(hits)}")

    # pass1c: 전역 유일 basename
    hits = [s for s in by_basename.get(base, []) if s != path]
    if len(hits) == 1:
        return ("REMAP", hits[0], "unique basename")
    if len(hits) > 1:
        return ("AMBIG", None, f"basename->{len(hits)}")

    # pass2: bare 시리즈 링크 → 첫 챕터
    fc = first_chapter(path, children)
    if fc:
        return ("SERIES", fc, "bare->first chapter")

    # pass3: strip
    if allow_strip:
        return ("STRIP", None, "dead link")
    return ("NONE", None, "no candidate")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="복구 적용 (기본은 dry-run)")
    ap.add_argument("--area", default="", help="src/content/blog 하위 경로로 한정")
    ap.add_argument("--no-strip", action="store_true", help="죽은 링크 strip 보류 (remap만)")
    ap.add_argument("--show", choices=["REMAP", "SERIES", "STRIP", "AMBIG", "NONE", "all"],
                    default="all")
    args = ap.parse_args()
    allow_strip = not args.no_strip

    idx = build_index()
    slugs = idx[0]
    scope = CONTENT_DIR / args.area if args.area else CONTENT_DIR

    counts = defaultdict(int)
    report = defaultdict(list)
    touched = 0
    unresolved = 0

    for md in sorted(scope.rglob("*.md")):
        text = md.read_text(encoding="utf-8")

        def repl(m):
            nonlocal touched, unresolved
            anchor, url = m.group(1), m.group(2)
            path = url.split("#", 1)[0].rstrip("/")
            frag = url[len(path):] if "#" in url else ""
            if path in slugs:
                return m.group(0)
            level, sugg, note = resolve(url, idx, allow_strip)
            if level == "OK":
                return m.group(0)
            counts[level] += 1
            if len(report[level]) < 200:
                report[level].append((str(md.relative_to(REPO_ROOT)), url, sugg, note))
            if level in ("REMAP", "SERIES") and sugg:
                return f"[{anchor}]({sugg}{frag})"
            if level == "STRIP":
                return anchor
            unresolved += 1  # AMBIG / NONE
            return m.group(0)

        new = TEXT_LINK.sub(repl, text)
        if new != text:
            touched += 1
            if args.apply:
                md.write_text(new, encoding="utf-8")

    print(f"=== Resolve Internal Links {'(APPLY)' if args.apply else '(DRY RUN)'} ===")
    print(f"  Scope: {args.area or 'ALL'}   strip: {'on' if allow_strip else 'off'}")
    print(f"  REMAP={counts['REMAP']}  SERIES={counts['SERIES']}  "
          f"STRIP={counts['STRIP']}  AMBIG={counts['AMBIG']}  NONE={counts['NONE']}")
    print(f"  Files {'touched' if args.apply else 'to touch'}: {touched}")
    for level in ("REMAP", "SERIES", "STRIP", "AMBIG", "NONE"):
        if args.show not in (level, "all") or not report[level]:
            continue
        print(f"\n--- {level} ({counts[level]}) ---")
        for rel, url, sugg, note in report[level]:
            arrow = f"  ⇒ {sugg}" if sugg else "  ⇒ (strip)" if level == "STRIP" else ""
            print(f"  {rel}  {url}{arrow}  ({note})")

    if not args.apply and unresolved:
        sys.exit(1)


if __name__ == "__main__":
    main()
