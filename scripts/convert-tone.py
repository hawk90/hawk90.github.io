#!/usr/bin/env python3
"""
convert-tone.py — 산문 문장 종결어미를 Tone B(~다) → Tone A(~합니다)로 변환.

OUTLIER/MIXED 챕터의 톤 정리를 보조한다. *고정밀 화이트리스트*만 변환하고,
목록에 없는 종결어미는 *건드리지 않는다*(잘못된 활용형 생성 방지). 남은 ~다는
audit-tone-consistency.py가 잡아 주므로, 그걸 보고 수동 보정한다.

대상: 산문 라인만. 코드펜스(```)·표 행(|)·헤딩(#)·이미지/링크 전용 라인은 제외.
위치: 문장 종결(종결어미 뒤에 .!?… 또는 줄 끝)만.

Usage:
  convert-tone.py --to A FILE [FILE...]            # dry-run (기본)
  convert-tone.py --to A --apply FILE [FILE...]    # 적용
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Tone B 종결어미 → Tone A. 긴 것 먼저(아니다 before 이다).
MAP_B_TO_A = [
    ("아니다", "아닙니다"),
    ("한다", "합니다"), ("된다", "됩니다"), ("이다", "입니다"),
    ("있다", "있습니다"), ("없다", "없습니다"), ("같다", "같습니다"),
    ("진다", "집니다"), ("난다", "납니다"), ("든다", "듭니다"),
    ("좋다", "좋습니다"), ("많다", "많습니다"), ("적다", "적습니다"),
    ("크다", "큽니다"), ("작다", "작습니다"), ("높다", "높습니다"),
    ("낮다", "낮습니다"), ("쉽다", "쉽습니다"), ("어렵다", "어렵습니다"),
    ("짧다", "짧습니다"), ("드물다", "드뭅니다"),
    # ~하다형 형용사·동사 (sentence-final)
    ("하다", "합니다"),
    # ㄴ다/는다 (자주 쓰는 것만 명시적으로)
    ("다룬다", "다룹니다"), ("보낸다", "보냅니다"), ("나뉜다", "나뉩니다"),
    ("않는다", "않습니다"), ("만든다", "만듭니다"), ("늘어난다", "늘어납니다"),
    ("줄어든다", "줄어듭니다"), ("나타난다", "나타납니다"),
    # 과거형
    ("았다", "았습니다"), ("었다", "었습니다"), ("였다", "였습니다"),
    ("됐다", "됐습니다"), ("왔다", "왔습니다"), ("갔다", "갔습니다"),
    ("났다", "났습니다"), ("렸다", "렸습니다"), ("졌다", "졌습니다"),
    ("쳤다", "쳤습니다"), ("썼다", "썼습니다"), ("뒀다", "뒀습니다"),
]

FENCE = re.compile(r"^\s*```")
SKIP = re.compile(r"^\s*([|#]|!\[|\[|>?\s*$)")  # 표·헤딩·이미지·빈줄
BOUND = r"(?=[.!?…)\"'»]|$)"  # 문장 종결 경계


def convert_line(line, mapping):
    changed = []
    for src, dst in mapping:
        pat = re.compile(re.escape(src) + BOUND)
        if pat.search(line):
            line, n = pat.subn(dst, line)
            if n:
                changed.append((src, dst, n))
    return line, changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--to", choices=["A"], default="A", help="현재 B→A만 지원")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    mapping = MAP_B_TO_A

    total = 0
    for f in args.files:
        p = Path(f)
        p = p if p.is_absolute() else REPO_ROOT / p
        lines = p.read_text(encoding="utf-8").split("\n")
        in_fence = False
        out, hits = [], []
        for i, line in enumerate(lines, 1):
            if FENCE.match(line):
                in_fence = not in_fence
                out.append(line)
                continue
            if in_fence or SKIP.match(line):
                out.append(line)
                continue
            new, ch = convert_line(line, mapping)
            if ch:
                hits.append((i, line.strip(), new.strip()))
            out.append(new)
        total += len(hits)
        print(f"=== {p.relative_to(REPO_ROOT)} — {len(hits)} 라인 변환 ===")
        for ln, before, after in hits[:80]:
            print(f"  L{ln}: …{before[-50:]}\n      → …{after[-50:]}")
        if args.apply and hits:
            p.write_text("\n".join(out), encoding="utf-8")
    print(f"\n{'APPLIED' if args.apply else 'DRY RUN'} — 총 {total} 라인")


if __name__ == "__main__":
    main()
