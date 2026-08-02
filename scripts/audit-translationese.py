#!/usr/bin/env python3
"""
audit-translationese.py — 번역체·AI 상투구 탐지 (CLAUDE.md §2).

audit-tone-consistency.py는 '~합니다/~다' *혼용*만 잡는다. 이 스크립트는 그와 별개로
§2가 금지한 *번역체·AI틱한 문장*을 탐지한다. 휴리스틱이므로 *후보 = 위반 아님* —
suspect-claims처럼 사람이 각 위치를 review한다.

두 계층:

  HARD (occurrence마다 file:line 보고) — §2가 명시적으로 금지:
    emdash-chain   한 문장에 em-dash(—) 2개 이상
    pronoun        '당신'·'여러분' 호명

  SOFT (챕터 밀도가 임계 초과할 때만 flag) — 적당히는 정상, 남발이 문제:
    geot-ida       '것이다'·'것입니다'   (동사로 끝낼 것을 명사화)
    via            '을/를 통해'          (through/via 번역체)
    passive-by     '에 의해'·'에 의한'    (수동태 번역체)
    about          '에 대해'·'에 대한'    (about 번역체)
    hedge          '라고 할 수 있'·'수 있을 것' (모호한 hedge)

코드펜스(```)·표(|)·헤딩(#)·블록인용(>)은 산문이 아니므로 제외한다.

Usage:
  audit-translationese.py [path...]         # 기본 = 전체 blog
  audit-translationese.py --include-drafts  # draft도 포함
  audit-translationese.py --show hard|soft|all
  audit-translationese.py --min 8           # 판정 최소 문장 수

Exit: 0 = 후보 없음, 1 = 후보 발견 (gate에서 warn 레벨로 표시).
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = REPO_ROOT / "src" / "content" / "blog"

FENCE = re.compile(r"^\s*```")
EMDASH = "—"  # —
SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+")
LIST_ITEM = re.compile(r"^\s*([-*+]|\d+\.)\s")   # 불릿·번호 항목 (— 라벨 구분자로 정상 사용)
PAREN = re.compile(r"\([^)]*\)")                 # 괄호 주석 (안의 — 는 gloss)
HANGUL = re.compile(r"[가-힣]")

# SOFT 패턴: (key, 정규식, 100문장당 임계)
SOFT = [
    ("geot-ida",   re.compile(r"것(이다|입니다)"),           3.0),
    ("via",        re.compile(r"(을|를) 통해"),               3.0),
    ("passive-by", re.compile(r"에 의(해|한)"),               2.5),
    ("about",      re.compile(r"에 대(해|한)"),               4.0),
    ("hedge",      re.compile(r"라고 할 수 있|수 있을 것"),   2.0),
]


def prose_lines(raw):
    """(원본 line 번호, 텍스트) 리스트 — frontmatter·코드펜스·표·헤딩·인용 제외."""
    m = re.match(r"^---\s*\n.*?\n---\s*\n", raw, re.DOTALL)
    start_off = raw[: m.end()].count("\n") if m else 0
    body = raw[m.end():] if m else raw
    out, in_fence = [], False
    for i, line in enumerate(body.split("\n"), start=start_off + 1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        s = line.lstrip()
        if s.startswith(("|", "#", ">")):
            continue
        out.append((i, line))
    return out


def analyze(raw, min_sent):
    lines = prose_lines(raw)
    text = "\n".join(t for _, t in lines)
    n_sent = max(len(SENT_SPLIT.split(text)), 1)

    hard = []  # (line_no, key, snippet)
    for line_no, line in lines:
        # em-dash 체인: *한국어 산문 문장*에 —가 2개 이상 (§2).
        # 불릿·번호 항목은 — 를 라벨 구분자로 정상 사용하므로 제외.
        # 괄호 주석 안의 — (gloss)도 제외.
        if not LIST_ITEM.match(line):
            for sent in SENT_SPLIT.split(line):
                if HANGUL.search(sent) and PAREN.sub("", sent).count(EMDASH) >= 2:
                    hard.append((line_no, "emdash-chain", sent.strip()[:70]))
        for mm in re.finditer(r"당신|여러분", line):
            a = max(mm.start() - 12, 0)
            hard.append((line_no, "pronoun", line[a:mm.end() + 12].strip()))

    soft = {}  # key -> (count, density)
    for key, rx, thr in SOFT:
        c = len(rx.findall(text))
        dens = c / n_sent * 100
        if dens >= thr:
            soft[key] = (c, round(dens, 1))

    return n_sent, hard, soft, min_sent


def collect(targets):
    files = []
    for t in targets:
        p = Path(t)
        p = p if p.is_absolute() else REPO_ROOT / p
        if p.is_file() and p.suffix == ".md":
            files.append(p)
        elif p.is_dir():
            files.extend(sorted(p.rglob("*.md")))
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--min", type=int, default=8, help="판정 최소 문장 수")
    ap.add_argument("--show", choices=["hard", "soft", "all"], default="all")
    ap.add_argument("--include-drafts", action="store_true", help="draft도 검사")
    args = ap.parse_args()

    files = collect(args.paths or [str(CONTENT)])

    hard_files, soft_files = [], []
    total_hard = 0
    for md in files:
        raw = md.read_text(encoding="utf-8", errors="ignore")
        if not args.include_drafts and re.search(r"^draft:\s*true\s*$", raw, re.MULTILINE):
            continue
        n_sent, hard, soft, _ = analyze(raw, args.min)
        if n_sent < args.min:
            continue
        try:
            rel = md.relative_to(REPO_ROOT)
        except ValueError:
            rel = md
        if hard:
            hard_files.append((rel, hard))
            total_hard += len(hard)
        if soft:
            soft_files.append((rel, soft))

    print("=== Translationese / AI-tell Audit (CLAUDE.md §2) ===")
    print(f"  검사 챕터: {len(files)}   HARD hit: {total_hard} "
          f"({len(hard_files)} 파일)   SOFT flag: {len(soft_files)} 파일")

    if args.show in ("hard", "all") and hard_files:
        print("\n--- ⚠ HARD (§2 명시 금지 — 각 위치 review) ---")
        for rel, hits in hard_files:
            for line_no, key, snip in hits:
                print(f"  {rel}:{line_no}  [{key}]  {snip}")

    if args.show in ("soft", "all") and soft_files:
        print("\n--- ℹ SOFT (밀도 임계 초과 — 남발 의심) ---")
        for rel, soft in soft_files:
            parts = ", ".join(f"{k}:{c}({d}/100문장)" for k, (c, d) in soft.items())
            print(f"  {rel}  {parts}")

    if not hard_files and not soft_files:
        print("  ✓ 번역체·AI 상투구 후보 없음.")
        return 0
    print("\n  후보 = 위반 아님. 각 위치를 사람이 review해 확정·수정.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
