#!/usr/bin/env python3
"""Unwrap ```text blocks that contain structured outline content:

    label1:
      - item a
      - item b

    label2:
      - item c

Into markdown:

    **label1:**

    - item a
    - item b

    **label2:**

    - item c

A block is converted only when every non-empty line matches one of:
- bullet line (`- ...` or `* ...`, optionally indented)
- "label:" line (text followed by colon, no other content)
- continuation line (indented, no bullet — folded into previous bullet)

This is conservative — won't touch blocks with prose paragraphs,
arrows (→), trees (├──), or other non-outline content.
"""
import re
import sys
from pathlib import Path

BULLET_RE = re.compile(r"^\s*[-*][\s]+(.+)$")
# Numbered heading: `1. Foo` or `1) Foo` at line start (no leading whitespace)
NUMBERED_RE = re.compile(r"^([0-9]+[.)])\s+(.+?)\s*$")
# Label line: optional whitespace + word(s) + colon, nothing else after.
LABEL_RE = re.compile(r"^\s*([^-*\[`{|<>=][^:`\n]*?):\s*$")


def classify(line: str) -> str:
    if not line.strip():
        return "blank"
    if BULLET_RE.match(line):
        return "bullet"
    if NUMBERED_RE.match(line):
        return "numbered"
    if LABEL_RE.match(line):
        return "label"
    # leading whitespace + plain text = continuation of previous bullet/label
    if line.startswith("  ") and not line.lstrip().startswith(("- ", "* ", "□ ")):
        return "cont"
    return "other"


def is_pure_outline(body: list[str]) -> bool:
    """Block qualifies if it has at least one label/bullet/numbered, and no
    other content."""
    saw_struct = False
    for line in body:
        c = classify(line)
        if c == "other":
            return False
        if c in ("label", "bullet", "numbered"):
            saw_struct = True
    return saw_struct


def render(body: list[str]) -> list[str]:
    out = []
    prev_cls = "blank"
    after_label = False
    for line in body:
        c = classify(line)
        if c == "label":
            m = LABEL_RE.match(line)
            label = m.group(1).strip()
            if prev_cls != "blank":
                out.append("")
            out.append(f"**{label}:**")
            out.append("")
            after_label = True
        elif c == "numbered":
            m = NUMBERED_RE.match(line)
            num, title = m.group(1), m.group(2)
            if prev_cls != "blank":
                out.append("")
            out.append(f"**{num} {title}**")
            out.append("")
            after_label = True
        elif c == "bullet":
            m = BULLET_RE.match(line)
            out.append(f"- {m.group(1).strip()}")
            after_label = False
        elif c == "cont":
            if after_label:
                out.append(f"- {line.strip()}")
            elif out and out[-1].startswith("- "):
                out[-1] = out[-1] + " " + line.strip()
            else:
                out.append(line.strip())
        else:  # blank
            if out and out[-1] != "":
                out.append("")
            after_label = False
        prev_cls = c
    while out and not out[-1]:
        out.pop()
    return out


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
            if lang in ("", "text") and is_pure_outline(body):
                out.extend(render(body))
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
