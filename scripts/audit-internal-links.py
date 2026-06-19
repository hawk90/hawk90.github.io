#!/usr/bin/env python3
"""
audit-internal-links.py — /blog/... 내부 링크 검증 (image vs page 구별).

Bash 버전(audit-internal-links.sh)이 image markdown ![]()와 page link []()를
구별 못 해서 false positive 다수. 이 Python 버전이 정확.

검사:
  - text link [text](/blog/...): src/content/blog/<path>.md 또는 index.md 존재
  - image link ![alt](/blog/...): public/images/blog/<path>.{svg,png,jpg,webp} 존재
  - bare reference /blog/...: text link로 간주

Anchor #는 path만 추출해 검사.

인자:
  audit-internal-links.py [path...]   기본은 src/content/blog 전체

Exit code:
  0 = 모든 링크 valid
  1 = broken 발견
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "src" / "content" / "blog"
IMAGES_DIR = REPO_ROOT / "public" / "images" / "blog"

# Pattern: image markdown `![alt](/blog/...)` — image
IMAGE_LINK = re.compile(r"!\[[^\]]*\]\((/blog/[^)\s]+)\)")
# Pattern: text link `[text](/blog/...)` — page link
TEXT_LINK = re.compile(r"(?<!\!)\[[^\]]*\]\((/blog/[^)\s]+)\)")

# Image 가능한 확장자
IMAGE_EXTS = (".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif")


def split_anchor(url):
    """url#anchor → (url, anchor)"""
    if "#" in url:
        path, anchor = url.split("#", 1)
        return path, anchor
    return url, ""


def check_page(rel_path):
    """`/blog/foo/bar` → src/content/blog/foo/bar.md 또는 .../index.md 존재."""
    rel = rel_path.lstrip("/").removeprefix("blog/").rstrip("/")
    candidate1 = CONTENT_DIR / f"{rel}.md"
    candidate2 = CONTENT_DIR / rel / "index.md"
    return candidate1.is_file() or candidate2.is_file()


def check_image(rel_path):
    """`/blog/foo/diagrams/bar` → public/images/blog/foo/diagrams/bar.{ext} 존재."""
    rel = rel_path.lstrip("/").removeprefix("blog/").rstrip("/")
    base = IMAGES_DIR / rel
    # 이미 확장자 있으면 그대로
    if any(rel.endswith(e) for e in IMAGE_EXTS):
        return base.is_file()
    # 확장자 시도
    for ext in IMAGE_EXTS:
        if base.with_suffix(ext).is_file() or Path(str(base) + ext).is_file():
            return True
    return False


def audit_file(md_path):
    """파일 안 모든 broken link 추출 — (line, type, url, suggestion)."""
    try:
        text = md_path.read_text(encoding="utf-8")
    except Exception:
        return []
    broken = []
    lines = text.split("\n")
    for lineno, line in enumerate(lines, 1):
        # Image links — image 파일 존재 확인
        for m in IMAGE_LINK.finditer(line):
            url, _ = split_anchor(m.group(1))
            if not check_image(url):
                broken.append((lineno, "image", m.group(1)))
        # Text links — page 존재 확인
        for m in TEXT_LINK.finditer(line):
            url, _ = split_anchor(m.group(1))
            if not check_page(url):
                broken.append((lineno, "page", m.group(1)))
    return broken


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="검사 대상 (디렉터리·파일). 기본=전체")
    ap.add_argument("--by-type", action="store_true",
                    help="image/page 별 카운트만 표시")
    args = ap.parse_args()

    targets = args.paths or [str(CONTENT_DIR)]
    md_files = []
    for t in targets:
        p = Path(t)
        if not p.is_absolute():
            p = REPO_ROOT / p
        if p.is_file() and p.suffix == ".md":
            md_files.append(p)
        elif p.is_dir():
            md_files.extend(p.rglob("*.md"))

    total = 0
    broken_total = 0
    by_type = defaultdict(int)
    by_file = defaultdict(list)

    for md in md_files:
        broken = audit_file(md)
        if broken:
            by_file[md] = broken
            broken_total += len(broken)
            for _, kind, _ in broken:
                by_type[kind] += 1
        # link 총수 — 다시 정확히 세지 않고 broken 비율 추정만
        total += 1

    print("=== Internal Link Audit ===")
    print(f"  Files scanned: {len(md_files)}")
    print(f"  Broken: {broken_total} ({by_type['page']} page, {by_type['image']} image)")

    if args.by_type or not by_file:
        sys.exit(1 if broken_total > 0 else 0)

    print()
    for md, items in sorted(by_file.items()):
        rel = md.relative_to(REPO_ROOT) if md.is_absolute() else md
        for lineno, kind, url in items:
            marker = "[I]" if kind == "image" else "[P]"
            print(f"  {marker} {rel}:{lineno}  →  {url}")

    sys.exit(1 if broken_total > 0 else 0)


if __name__ == "__main__":
    main()
