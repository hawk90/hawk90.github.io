#!/usr/bin/env python3
"""check-post-dates.py — validate frontmatter dates and optionally sync to git.

이 스크립트는 두 가지 일을 한다.

1. **검증** — frontmatter의 `date:` 가 *parseable한 ISO 8601* 인지 확인.
   잘못된 시각(`T130:00:00`, `T25:00:00`)·잘못된 날짜(2026-02-31 등)를 찾아 보고.

2. **자동 동기화** — `--from-git` 옵션을 주면, 각 글의 frontmatter `date:`를
   *git이 기록한 최초 commit 시각*으로 덮어쓴다. 글이 git history에 없으면
   파일의 `mtime`을 사용.

Usage:
  # 잘못된 날짜만 보기
  scripts/check-post-dates.py

  # git 최초 commit 시각으로 자동 수정 (dry-run)
  scripts/check-post-dates.py --from-git --dry-run

  # 실제 적용
  scripts/check-post-dates.py --from-git

  # 잘못된 형식만 자동 정리 (T130 → T13)
  scripts/check-post-dates.py --fix-invalid

  # 특정 경로만
  scripts/check-post-dates.py src/content/blog/embedded
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG_ROOT = ROOT / "src/content/blog"

DATE_LINE_RE = re.compile(r"^date:\s*(\S+)\s*$", re.MULTILINE)
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)
# T130:00:00 같은 잘못된 시각: 3-digit hour
BAD_HOUR_RE = re.compile(r"^(.*T)(\d{3})(:.*)$")


def parse_frontmatter_date(text: str) -> str | None:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    fm = m.group(1)
    d = DATE_LINE_RE.search(fm)
    return d.group(1) if d else None


def try_parse_iso(s: str) -> datetime | None:
    """ISO 8601로 파싱. T25:, T130: 같은 비정상 형식은 None."""
    try:
        # Python 3.11+ supports fractional seconds and offsets. We accept
        # naive datetimes for blog posts.
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def normalize_invalid(s: str) -> str | None:
    """T130:00:00 → T13:00:00 같이 3-digit hour를 2-digit으로 자른다.

    Returns:
        수정된 문자열, 또는 변경 불가능하면 None.
    """
    m = BAD_HOUR_RE.match(s)
    if m:
        hour3 = m.group(2)
        hour2 = hour3[:2]
        # 2-digit hour가 0-23 범위인지 확인
        try:
            h = int(hour2)
            if 0 <= h < 24:
                fixed = f"{m.group(1)}{hour2}{m.group(3)}"
                if try_parse_iso(fixed):
                    return fixed
        except ValueError:
            pass
    return None


def git_first_commit_iso(path: Path) -> str | None:
    """파일의 *최초* git commit 시각을 ISO 8601 (local)로 반환.

    파일이 git history에 없으면 None.
    """
    try:
        result = subprocess.run(
            [
                "git",
                "log",
                "--diff-filter=A",
                "--follow",
                "--format=%aI",  # author date ISO strict
                "--",
                str(path),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except (FileNotFoundError, OSError):
        return None
    if result.returncode != 0:
        return None
    lines = [ln for ln in result.stdout.strip().splitlines() if ln]
    if not lines:
        return None
    # `--diff-filter=A` 와 `--follow` 조합은 가장 오래된(추가) 커밋이 마지막 줄.
    raw = lines[-1]
    dt = try_parse_iso(raw)
    if not dt:
        return None
    # Drop timezone and microseconds for blog format consistency.
    return dt.replace(tzinfo=None, microsecond=0).isoformat()


def file_mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime).replace(microsecond=0).isoformat()


def replace_date_in_text(text: str, new_date: str) -> str | None:
    """frontmatter의 date 줄을 교체. 실패하면 None."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    fm = m.group(1)
    new_fm = DATE_LINE_RE.sub(f"date: {new_date}", fm, count=1)
    if new_fm == fm:
        return None
    return text.replace(fm, new_fm, 1)


def collect_targets(paths: list[Path]) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        p = p.resolve()
        if p.is_file() and p.suffix == ".md":
            out.append(p)
        elif p.is_dir():
            out.extend(sorted(p.rglob("*.md")))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="검사할 파일/디렉토리. 기본은 src/content/blog 전체.",
    )
    ap.add_argument(
        "--from-git",
        action="store_true",
        help="frontmatter date를 git 최초 commit 시각으로 덮어쓰기.",
    )
    ap.add_argument(
        "--fix-invalid",
        action="store_true",
        help="T130:00:00 같은 비정상 시각만 자동 정리 (T13:00:00 등).",
    )
    ap.add_argument("--dry-run", action="store_true", help="변경 없이 미리보기만.")
    ap.add_argument("--quiet", action="store_true", help="OK 메시지 생략.")
    args = ap.parse_args()

    paths = args.paths or [BLOG_ROOT]
    files = collect_targets(paths)

    if not files:
        print("No .md files found.", file=sys.stderr)
        return 1

    invalid_count = 0
    fixed_count = 0
    synced_count = 0
    missing_count = 0
    ok_count = 0

    for f in files:
        text = f.read_text(encoding="utf-8")
        raw = parse_frontmatter_date(text)
        rel = f.relative_to(ROOT)

        if raw is None:
            missing_count += 1
            print(f"MISSING  {rel}  (no date in frontmatter)")
            continue

        dt = try_parse_iso(raw)
        new_date: str | None = None
        why = ""

        if dt is None:
            invalid_count += 1
            if args.fix_invalid or args.from_git:
                fix = normalize_invalid(raw)
                if fix:
                    new_date = fix
                    why = "INVALID → normalized hour"
                else:
                    print(f"INVALID  {rel}  date={raw!r} (cannot auto-fix)")
                    continue
            else:
                print(f"INVALID  {rel}  date={raw!r}")
                continue

        if args.from_git:
            git_iso = git_first_commit_iso(f)
            if git_iso:
                if git_iso != (new_date or raw):
                    new_date = git_iso
                    why = "git first commit"
            else:
                git_iso = file_mtime_iso(f)
                if git_iso != (new_date or raw):
                    new_date = git_iso
                    why = "file mtime (not in git)"

        if new_date is None:
            if not args.quiet:
                ok_count += 1
            continue

        action = "DRY     " if args.dry_run else "UPDATED "
        print(f"{action} {rel}  {raw} → {new_date}  ({why})")

        if not args.dry_run:
            updated = replace_date_in_text(text, new_date)
            if updated is not None:
                f.write_text(updated, encoding="utf-8")
                if dt is None:
                    fixed_count += 1
                else:
                    synced_count += 1

    print()
    print(f"Files scanned: {len(files)}")
    if missing_count:
        print(f"Missing date: {missing_count}")
    if invalid_count:
        print(f"Invalid date: {invalid_count}{' (fixed)' if args.fix_invalid or args.from_git else ''}")
    if synced_count:
        print(f"Synced to git: {synced_count}")
    if args.dry_run:
        print("(dry run — no files written)")

    return 0 if (invalid_count == 0 or args.fix_invalid or args.from_git) else 2


if __name__ == "__main__":
    sys.exit(main())
