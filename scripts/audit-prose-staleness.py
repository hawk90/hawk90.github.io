#!/usr/bin/env python3
"""
audit-prose-staleness.py — 발행 콘텐츠의 *stale해질 미래 시제·날짜 앵커* 주장 탐지.

roadmap-staleness.py가 *known-facts.yaml에 등재된 SKU*만 본다면, 이 스크립트는
*본문 산문 자체*를 훑는다. 이번 세션이 드러낸 gap: "RTX 50 출시 예정"·"Samsung
qualification 진행" 같은 *이미 지난 미래 시제*가 어떤 자동화에도 안 걸렸다.

두 신호를 구분해 오탐을 억제한다.

  ① STRONG 마커 (단독으로도 roadmap 신호):
       미발표 · 출시 예정 · 발표 예정 · 나올 예정 · 곧 출시 · 양산 램프 ·
       qualification 진행 · qual 진행
  ② SOFT 마커 (+제품/spec 토큰 *같은 줄* 동반 시에만):
       예정 · 예상됩니다 · 예상된다
       → "삭제 예정 객체"·"예정된 maintenance window" 같은 일반 산문은 제외.
  ③ DATED 앵커 (기준 연도 경과 검사):
       "YYYY년 현재" · "as of YYYY" · "현재 기준"
       → 앵커 연도 < 기준 연도면 *지남*으로 표시.

제품/spec 토큰(TOKEN)은 verify-known-facts.sh와 같은 *형태 기반* 정규식.
후보 = hallucination/오류 아님. *사람이 위치를 열어 지금도 유효한지* 확인.

Usage:
  audit-prose-staleness.py                      # 전체 published
  audit-prose-staleness.py <path> [<path> ...]  # 특정 파일·디렉토리
  audit-prose-staleness.py --as-of 2027-01-01   # 가상 기준일(테스트)

Exit: 0 = 후보 없음, 1 = 후보 있음(수동 review).
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TARGET = REPO_ROOT / "src" / "content" / "blog"

STRONG = re.compile(
    r"미발표|출시\s*예정|발표\s*예정|나올\s*예정|곧\s*출시|양산\s*램프|"
    r"램프\s*예정|qualification\s*진행|qual\s*진행"
)
SOFT = re.compile(r"예정|예상됩니다|예상된다|예상된\b")
# 제품/spec 토큰 — verify-known-facts.sh와 같은 형태 기반(정확 SKU 아님).
TOKEN = re.compile(
    r"H[12][0-9]{2}|GH[0-9]{3}|B[1-3][0-9]{2}|GB[0-9]{3}|MI[0-9]{3}|"
    r"HBM[0-9]|GDDR[0-9]|LPDDR[0-9]|DDR[0-9]|CXL\s+[0-9]\.[0-9]|"
    r"PCIe\s+[0-9]|UALink|JESD[0-9]|RTX\s+[0-9]{3,4}|Rubin|Vera|"
    r"Blackwell|Gaudi|Trillium|TPU\s*v[0-9]"
)
DATED = re.compile(r"((?:19|20)[0-9]{2})\s*년\s*현재|[Aa]s of\s+((?:19|20)[0-9]{2})")


def iter_published(targets):
    for t in targets:
        p = Path(t).resolve()
        files = [p] if p.is_file() else sorted(p.rglob("*.md"))
        for f in files:
            try:
                text = f.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            if re.search(r"^draft:\s*true", text, re.MULTILINE):
                continue
            yield f, text


def prose_lines(text):
    """Return only narrative lines; frontmatter and fenced examples are not claims."""
    lines = text.split("\n")
    start = 0
    if text.startswith("---"):
        try:
            start = lines.index("---", 1) + 1
        except ValueError:
            return []
    out, in_fence = [], False
    for line_no, line in enumerate(lines[start:], start=start + 1):
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append((line_no, line))
    return out


def scan_line(line, as_of):
    """한 줄 → (reason, note) 또는 None. reason: future | dated."""
    if STRONG.search(line):
        return ("future", "미래 시제 — 이미 출시/확정됐는지 확인")
    if SOFT.search(line) and TOKEN.search(line):
        return ("future", "미래 시제 + 제품/spec 토큰 — 현재 상태 확인")
    md = DATED.search(line)
    if md:
        yr = md.group(1) or md.group(2)
        if yr and int(yr) < as_of.year:
            return ("dated", f"기준 연도 {yr} < {as_of.year} — 갱신 필요")
        return ("dated", f"날짜 앵커 {yr} — 기준 연도 경과 시 갱신")
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*", help="파일·디렉토리 (기본=전체 published)")
    ap.add_argument("--as-of", help="기준일 YYYY-MM-DD (기본=오늘)")
    ap.add_argument("--json", help="결과 JSON 출력 경로")
    args = ap.parse_args()
    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    targets = args.targets or [DEFAULT_TARGET]

    hits = []  # (relpath, lineno, reason, note, text)
    for f, text in iter_published(targets):
        rel = f.relative_to(REPO_ROOT)
        for i, line in prose_lines(text):
            r = scan_line(line, as_of)
            if r:
                hits.append((str(rel), i, r[0], r[1], line.strip()[:100]))

    print("=== Prose Staleness Audit ===")
    print(f"  기준일: {as_of.isoformat()}   후보: {len(hits)}")
    if args.json:
        Path(args.json).write_text(json.dumps({
            "asOf": as_of.isoformat(),
            "findings": [
                {"file": rel, "line": line, "kind": kind, "note": note, "text": text}
                for rel, line, kind, note, text in hits
            ],
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not hits:
        print("\n✓ stale 후보 없음.")
        return 0

    fut = [h for h in hits if h[2] == "future"]
    dat = [h for h in hits if h[2] == "dated"]
    if fut:
        print(f"\n--- ⏳ 미래 시제 ({len(fut)}) — 이미 지났는지 확인 ---")
        for rel, ln, _, note, txt in fut:
            print(f"  {rel}:{ln}  [{note}]")
            print(f"      {txt}")
    if dat:
        print(f"\n--- 📅 날짜 앵커 ({len(dat)}) ---")
        for rel, ln, _, note, txt in dat:
            print(f"  {rel}:{ln}  [{note}]")
            print(f"      {txt}")

    print("\n후보 = 오류 아님. 각 위치를 열어 *지금도 유효한지* 확인 후 갱신.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
