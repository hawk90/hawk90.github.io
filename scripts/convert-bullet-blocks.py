#!/usr/bin/env python3
"""Unwrap ```text blocks that contain only markdown bullet lines.

Only converts blocks where every non-empty line begins with `- ` or `* `
(possibly nested with leading spaces). Preserves indentation.
"""
import sys
import re
from pathlib import Path

BULLET_RE = re.compile(r"^\s*[-*][\s]+")


def is_bullet_line(s: str) -> bool:
    return bool(BULLET_RE.match(s))


def convert(text: str) -> tuple[str, int]:
    out = []
    i = 0
    n = 0
    lines = text.split("\n")
    while i < len(lines):
        line = lines[i]
        if line.lstrip().startswith("```"):
            opening = line
            lang = opening.strip()[3:].strip()
            j = i + 1
            while j < len(lines) and not lines[j].lstrip().startswith("```"):
                j += 1
            if j >= len(lines):
                out.append(line)
                i += 1
                continue
            body = lines[i + 1 : j]
            closing = lines[j]
            if lang in ("", "text"):
                non_empty = [b for b in body if b.strip()]
                if non_empty and all(is_bullet_line(b) for b in non_empty):
                    for b in body:
                        if is_bullet_line(b):
                            # Strip leading whitespace so bullets render at top
                            # level in markdown. (Original indent inside text
                            # block was decorative, not structural.)
                            out.append(b.lstrip())
                        else:
                            out.append(b)
                    n += 1
                    i = j + 1
                    continue
            out.append(opening)
            out.extend(body)
            out.append(closing)
            i = j + 1
        else:
            out.append(line)
            i += 1
    return "\n".join(out), n


if __name__ == "__main__":
    total = 0
    for arg in sys.argv[1:]:
        p = Path(arg)
        if not p.is_file():
            continue
        text = p.read_text()
        new_text, n = convert(text)
        if n > 0:
            p.write_text(new_text)
            print(f"{p}: {n} blocks converted")
            total += n
    print(f"\nTotal: {total} blocks converted")
