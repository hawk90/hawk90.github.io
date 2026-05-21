#!/usr/bin/env python3
"""Convert self-check ```text blocks containing ``□ ...?`` lines into
markdown checklists.
"""
import sys
from pathlib import Path


def convert(text: str) -> tuple[str, int]:
    out = []
    i = 0
    n = 0
    lines = text.split("\n")
    while i < len(lines):
        line = lines[i]
        # Detect opening of a code block (any language tag)
        if line.lstrip().startswith("```"):
            opening = line
            lang = opening.strip()[3:].strip()
            # find matching closing fence
            j = i + 1
            while j < len(lines) and not lines[j].lstrip().startswith("```"):
                j += 1
            if j >= len(lines):
                # unclosed — bail
                out.append(line)
                i += 1
                continue
            body = lines[i + 1 : j]
            closing = lines[j]
            # Only consider unwrapping if no lang tag (or "text")
            if lang in ("", "text"):
                non_empty = [b for b in body if b.strip()]
                if non_empty and all(
                    b.lstrip().startswith("□ ") for b in non_empty
                ):
                    for b in body:
                        if b.strip().startswith("□ "):
                            out.append("- [ ] " + b.lstrip()[2:])
                        else:
                            out.append(b)
                    n += 1
                    i = j + 1
                    continue
            # not a checklist — keep entire block as-is
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
