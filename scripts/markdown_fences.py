"""CommonMark-style fenced code block tracking, shared by the Python checkers.

A fence opens with three or more backticks or tildes and closes only on the
same character, at least as long, with nothing after it. Toggling on every
line that starts with ``` let a ````markdown block that shows a ```python
line, or a ~~~ block containing ```, hide the rest of the file from the
checks.
"""

import re

_FENCE = re.compile(r"^[ \t]*(`{3,}|~{3,})(.*)$")


class Fences:
    def __init__(self):
        self.char = None
        self.length = 0

    @property
    def inside(self):
        return self.char is not None

    def step(self, line):
        """Advance over one line. Returns the info string ('' if none) when the
        line opens a fence, True when it closes one, None otherwise."""
        m = _FENCE.match(line)
        if not m:
            return None
        marker, rest = m.group(1), m.group(2)
        if self.char is None:
            if marker[0] == "`" and "`" in rest:
                return None  # inline code span, not a fence
            self.char, self.length = marker[0], len(marker)
            return rest.strip()
        if marker[0] == self.char and len(marker) >= self.length and not rest.strip():
            self.char, self.length = None, 0
            return True
        return None
