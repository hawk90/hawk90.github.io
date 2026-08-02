#!/usr/bin/env python3
"""Detect non-code structures inside Markdown text fences.

This is the single-process implementation behind detect-prose-in-code.sh.
Only structural prose signals are blocking; code comments and command examples
with Korean explanations are intentionally ignored.
"""

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = ROOT / "src" / "content" / "blog"
FENCE = re.compile(r"^\s*```")
CHECKBOX = re.compile(r"^\s*\[[ xX]\]\s")
BOLD_LABEL = re.compile(r"^\*\*[^*]+\*\*\s*$")
KOREAN_BULLET = re.compile(r"^\s*[-*]\s+[가-힣]")
CODE_CUE = re.compile(r"^\s*(?:#|//|--|;)|[#:;{}()\[\]<>|`]")
TREE_CUE = re.compile(r"[├└│─┌┐┘┬┴┼╰╯╭╮]")


def prose_reason(lines):
    reasons, snippet = [], ""
    for line in lines:
        if CHECKBOX.search(line):
            reasons.append("checkbox")
            snippet = snippet or line.strip()
        if BOLD_LABEL.search(line):
            reasons.append("bold-label")
            snippet = snippet or line.strip()
        if KOREAN_BULLET.search(line) and not CODE_CUE.search(line):
            reasons.append("korean-bullet")
            snippet = snippet or line.strip()
        hangul = len(re.findall(r"[가-힣]", line))
        if hangul >= 6 and not CODE_CUE.search(line) and not TREE_CUE.search(line):
            reasons.append("korean-prose")
            snippet = snippet or line.strip()
    return sorted(set(reasons)), snippet[:60]


def scan_file(path):
    hits, in_fence, start, lang, body = [], False, 0, "", []
    for line_no, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
        if not FENCE.match(line):
            if in_fence:
                body.append(line)
            continue
        if not in_fence:
            in_fence, start, lang, body = True, line_no, line.strip()[3:].strip().lower(), []
            continue
        if lang in {"", "text", "asciidoc", "markdown", "md"}:
            reasons, snippet = prose_reason(body)
            if reasons:
                hits.append((start, reasons, snippet))
        in_fence = False
    return hits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--published-only", action="store_true")
    args = parser.parse_args()
    total = 0
    for path in sorted(CONTENT_ROOT.rglob("*.md")):
        raw = path.read_text(encoding="utf-8", errors="ignore")
        if args.published_only and not re.search(r"^draft:\s*false\s*$", raw, re.MULTILINE):
            continue
        for line_no, reasons, snippet in scan_file(path):
            print(f"{path.relative_to(ROOT)}:{line_no}  [{' '.join(reasons)}]  {snippet}")
            total += 1
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
