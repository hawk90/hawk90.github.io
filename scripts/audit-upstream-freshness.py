#!/usr/bin/env python3
"""
Upstream freshness audit — code-review·spec-analysis 시리즈가 *upstream 코드 변경*에
얼마나 뒤처졌는지 자동 분석.

동작:
1. data/upstream-tracking.yaml 읽음 — 시리즈별 baseline commit 명시
2. 각 시리즈마다:
   a. Local clone 없으면 *자동 clone*
   b. 있으면 *fetch + checkout tracking branch*
   c. `git log baseline..HEAD --stat` → 변경 파일·라인
   d. 시리즈 챕터에서 *upstream 파일 path 인용*을 grep → chapter↔file 매핑
   e. 영향 챕터 ranking — *영향 파일 수 × 변경 라인 수*로 score
3. (옵션) GitHub release note·CVE feed 확인 — `gh` CLI 있을 때만

출력:
- 시리즈별 staleness summary
- Top 영향 챕터 ranking (--top N)
- JSON summary (--json)

사용:
    python3 scripts/audit-upstream-freshness.py
    python3 scripts/audit-upstream-freshness.py --series folly
    python3 scripts/audit-upstream-freshness.py --top 20 --json out.json
    python3 scripts/audit-upstream-freshness.py --no-fetch  # offline mode
"""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TRACKING_FILE = REPO_ROOT / "data" / "upstream-tracking.yaml"


def load_yaml(path):
    """yq CLI로 YAML → JSON 변환 후 json 모듈로 파싱 (PyYAML 의존성 제거)."""
    try:
        out = subprocess.check_output(["yq", "-o=json", str(path)], text=True)
        return json.loads(out)
    except FileNotFoundError:
        print("ERROR: yq required (brew install yq)", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"ERROR parsing YAML {path}: {e}", file=sys.stderr)
        sys.exit(1)


def expand_path(p):
    return Path(os.path.expanduser(p)).resolve()


def run(cmd, cwd=None, check=True, capture=True):
    """Run subprocess, return (returncode, stdout)."""
    result = subprocess.run(
        cmd, cwd=cwd, check=False,
        capture_output=capture, text=True
    )
    if check and result.returncode != 0:
        print(f"ERROR running {' '.join(cmd)}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return result.returncode, result.stdout


def ensure_clone(repo_url, local_path, branch):
    """Clone if missing, otherwise fetch."""
    local = expand_path(local_path)
    if not local.exists():
        local.parent.mkdir(parents=True, exist_ok=True)
        print(f"  cloning {repo_url} → {local}", file=sys.stderr)
        run(["git", "clone", "--quiet", repo_url, str(local)])
    return local


def fetch_upstream(local_path, branch):
    """Fetch latest from origin."""
    print(f"  fetching origin/{branch}", file=sys.stderr)
    run(["git", "fetch", "--quiet", "origin", branch], cwd=local_path)


def _path_in_subsystems(path, subsystem_paths):
    """path가 subsystem_paths prefix 중 하나로 시작하는지."""
    if not subsystem_paths:
        return True  # 필터 없으면 전부 통과
    return any(path.startswith(s) for s in subsystem_paths)


def get_diff_files(local_path, baseline, branch, subsystem_paths=None):
    """git log baseline..origin/branch -- <paths>로 path 필터링.

    subsystem_paths가 있으면 git 자체에 -- pathspec 전달해 빠르게.
    """
    cmd = ["git", "log", f"{baseline}..origin/{branch}", "--name-only", "--format="]
    if subsystem_paths:
        cmd += ["--"] + list(subsystem_paths)
    code, out = run(cmd, cwd=local_path)
    files = defaultdict(int)
    for line in out.splitlines():
        line = line.strip()
        if line:
            files[line] += 1
    return files


def get_commit_count(local_path, baseline, branch, subsystem_paths=None):
    cmd = ["git", "rev-list", "--count", f"{baseline}..origin/{branch}"]
    if subsystem_paths:
        cmd += ["--"] + list(subsystem_paths)
    code, out = run(cmd, cwd=local_path)
    return int(out.strip())


def get_diff_stat(local_path, baseline, branch, subsystem_paths=None):
    """Total insertions + deletions (선택 path filter)."""
    cmd = ["git", "log", f"{baseline}..origin/{branch}", "--shortstat", "--format="]
    if subsystem_paths:
        cmd += ["--"] + list(subsystem_paths)
    code, out = run(cmd, cwd=local_path)
    insertions = deletions = 0
    for line in out.splitlines():
        m = re.search(r"(\d+) insertion", line)
        if m:
            insertions += int(m.group(1))
        m = re.search(r"(\d+) deletion", line)
        if m:
            deletions += int(m.group(1))
    return insertions, deletions


def find_chapter_file_refs(series_dir, file_patterns):
    """Chapter당 인용된 upstream 파일 set 추출 + 시리즈 전체 chapter 수.

    return: (chapter_refs dict, total_chapters int)
    chapter_refs: 패턴 매치된 챕터만 (영향 평가 input)
    total_chapters: STORYBOARD 제외 시리즈 디렉토리 안 모든 .md 수
    """
    series = expand_path(REPO_ROOT / series_dir)
    chapter_refs = defaultdict(set)
    compiled = [re.compile(p) for p in file_patterns]
    total = 0
    for chapter_md in series.glob("*.md"):
        if chapter_md.name == "STORYBOARD.md":
            continue
        total += 1
        try:
            text = chapter_md.read_text(encoding="utf-8")
        except Exception:
            continue
        for cp in compiled:
            for m in cp.finditer(text):
                chapter_refs[chapter_md.name].add(m.group(0))
    return chapter_refs, total


# Code source 파일만 분석 대상 (build·doc·script 제외)
_SOURCE_EXT = (".h", ".hpp", ".cpp", ".cc", ".cxx", ".c", ".inl")

# 흔한 namespace·alias — false positive 노이즈로 분류해 제외
_NAMESPACE_NOISE = {
    "detail", "internal", "test", "tests", "tools",
    "futures", "coro", "io", "json", "format", "dynamic",
    "strings", "time", "status", "container", "flags",
    "base", "synchronization", "hash", "log", "memory",
    "numeric", "random", "types", "utility", "meta",
}

# Path weight — exact path match가 가장 신뢰성 높음
_WEIGHT_PATH = 5
_WEIGHT_SYMBOL_BASENAME = 2  # PascalCase 심볼이 변경 파일 basename과 exact match


def _is_source(path):
    return path.endswith(_SOURCE_EXT)


def _is_pascal_case(name):
    """PascalCase (대문자로 시작, 일반적으로 class/struct/type)."""
    return bool(name) and name[0].isupper()


def _basename_no_ext(path):
    """folly/io/IOBuf.h → IOBuf"""
    base = path.rsplit("/", 1)[-1]
    for ext in _SOURCE_EXT:
        if base.endswith(ext):
            return base[: -len(ext)]
    return base


def rank_affected_chapters(chapter_refs, changed_files):
    """챕터별 영향 ranking — weighted score.

    - Exact path match (weight 5)
    - PascalCase symbol → 변경 source file basename과 *exact* match (weight 2)
    - 소문자 namespace 심볼은 노이즈로 제외
    """
    # 분석 대상 파일만 (source code only)
    source_files = {p: c for p, c in changed_files.items() if _is_source(p)}
    source_paths = set(source_files.keys())

    # Basename → path 매핑 (symbol → file basename 정확 매칭용)
    basename_to_paths = defaultdict(list)
    for p in source_paths:
        basename_to_paths[_basename_no_ext(p)].append(p)

    scores = {}
    for chapter, refs in chapter_refs.items():
        hits = []
        for r in refs:
            # 1) Exact path match
            if r in source_paths:
                hits.append(("path", r, source_files[r] * _WEIGHT_PATH))
                continue

            # 2) Symbol match (PascalCase + basename exact)
            if "::" in r:
                sym = r.split("::")[-1]
                if sym in _NAMESPACE_NOISE:
                    continue
                if not _is_pascal_case(sym):
                    continue
                # basename이 정확히 같은 source file을 찾음
                matching_paths = basename_to_paths.get(sym, [])
                if matching_paths:
                    # 모든 match를 합산 (한 symbol이 여러 file에 정의될 수 있음)
                    total = sum(source_files[p] for p in matching_paths)
                    hits.append(
                        ("symbol", r, total * _WEIGHT_SYMBOL_BASENAME)
                    )

        if hits:
            scores[chapter] = {
                "hits": hits,
                "score": sum(h[2] for h in hits),
            }
    return sorted(scores.items(), key=lambda x: -x[1]["score"])


def get_releases(repo_url):
    """gh CLI로 최근 release 정보 가져오기. 없으면 빈 list."""
    m = re.match(r"https?://github\.com/([^/]+/[^/]+?)(?:\.git)?$", repo_url)
    if not m:
        return []
    repo = m.group(1)
    code, out = run(
        ["gh", "release", "list", "-R", repo, "-L", "5", "--json", "name,publishedAt,tagName"],
        check=False
    )
    if code != 0:
        return []
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return []


def audit_series(entry, no_fetch=False, top=10, fetch_releases=False):
    """단일 시리즈 audit."""
    title = entry["title"]
    series_dir = entry["series_dir"]
    upstream = entry["upstream"]
    repo_url = upstream["repo_url"]
    local_path = upstream["local_path"]
    branch = upstream["branch"]
    baseline = upstream["baseline_commit"]
    baseline_date = upstream.get("baseline_date", "")
    subsystem_paths = upstream.get("subsystem_paths") or None
    file_patterns = entry.get("file_patterns", [])

    print(f"\n=== {title} ===", file=sys.stderr)
    print(f"  baseline: {baseline[:12]} ({baseline_date})", file=sys.stderr)
    if subsystem_paths:
        print(f"  subsystems: {', '.join(subsystem_paths)}", file=sys.stderr)

    # 1. Clone / fetch
    local = ensure_clone(repo_url, local_path, branch)
    if not no_fetch:
        fetch_upstream(local, branch)

    # 2. Diff 분석 (subsystem_paths가 있으면 git pathspec으로 필터)
    commit_count = get_commit_count(local, baseline, branch, subsystem_paths)
    insertions, deletions = get_diff_stat(local, baseline, branch, subsystem_paths)
    changed_files = get_diff_files(local, baseline, branch, subsystem_paths)

    # 3. Chapter ↔ file 매핑
    chapter_refs, chapter_count = find_chapter_file_refs(series_dir, file_patterns)

    # 4. 영향 챕터 ranking
    ranked = rank_affected_chapters(chapter_refs, changed_files)

    # 5. (옵션) Release note
    releases = []
    if fetch_releases:
        releases = get_releases(repo_url)

    return {
        "id": entry["id"],
        "title": title,
        "baseline": {"commit": baseline, "date": baseline_date},
        "since_baseline": {
            "commits": commit_count,
            "insertions": insertions,
            "deletions": deletions,
            "files_changed": len(changed_files),
        },
        "chapters_total": chapter_count,
        "chapters_affected": len(ranked),
        "top_chapters": [
            {"chapter": c, "score": d["score"], "hits": d["hits"][:5]}
            for c, d in ranked[:top]
        ],
        "releases": releases,
    }


def format_report(results):
    """사람이 읽는 text report."""
    lines = []
    lines.append("# Upstream Freshness Audit\n")
    for r in results:
        lines.append(f"## {r['title']}\n")
        bl = r["baseline"]
        sb = r["since_baseline"]
        lines.append(f"- Baseline: `{bl['commit'][:12]}` ({bl['date']})")
        lines.append(f"- Since baseline: **{sb['commits']} commits**, "
                     f"+{sb['insertions']}/-{sb['deletions']} lines, "
                     f"{sb['files_changed']} files changed")
        lines.append(f"- Chapters: total={r['chapters_total']}, affected={r['chapters_affected']}")

        if r["releases"]:
            lines.append("- Recent releases:")
            for rel in r["releases"][:3]:
                lines.append(f"    - `{rel.get('tagName','?')}` "
                             f"({rel.get('publishedAt','?')[:10]}) — {rel.get('name','')}")

        if r["top_chapters"]:
            lines.append("\n### Top 영향 챕터")
            for tc in r["top_chapters"]:
                lines.append(f"- **{tc['chapter']}** (score={tc['score']})")
                for kind, ref, count in tc["hits"][:3]:
                    lines.append(f"    - `{ref}` ({kind}, changed {count}×)")
        else:
            lines.append("\n### 영향 챕터 없음 ✓")

        lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Upstream freshness audit")
    ap.add_argument("--series", help="단일 시리즈 id로 제한", default=None)
    ap.add_argument("--no-fetch", action="store_true", help="fetch 안 함 (offline)")
    ap.add_argument("--top", type=int, default=10, help="ranking 상위 N 챕터")
    ap.add_argument("--json", help="JSON 출력 경로", default=None)
    ap.add_argument("--releases", action="store_true", help="gh CLI로 release 정보 추가")
    args = ap.parse_args()

    if not TRACKING_FILE.exists():
        print(f"ERROR: {TRACKING_FILE} not found", file=sys.stderr)
        sys.exit(1)

    config = load_yaml(TRACKING_FILE)

    results = []
    for entry in config.get("trackings", []):
        if args.series and entry["id"] != args.series:
            continue
        try:
            r = audit_series(entry, no_fetch=args.no_fetch, top=args.top,
                             fetch_releases=args.releases)
            results.append(r)
        except Exception as e:
            print(f"ERROR auditing {entry['id']}: {e}", file=sys.stderr)
            import traceback; traceback.print_exc(file=sys.stderr)

    report = format_report(results)
    print(report)

    if args.json:
        with open(args.json, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nJSON written: {args.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
