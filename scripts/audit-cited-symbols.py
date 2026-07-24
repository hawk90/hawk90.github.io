#!/usr/bin/env python3
"""
Cited-symbol existence audit — 글이 인용한 라이브러리 심볼이 *upstream에 실제로
존재*하는지 검사. rename·삭제·hallucination(존재하지 않는 API 이름)을 자동 탐지.

배경:
    2026-07 Folly·Abseil 발행 전 점검에서, 이 검사(당시 임시 스크립트)가
    `collectAnySuccessful`(→collectAnyWithoutException), `SharedMutex_ReadPriority`
    (→SharedMutexReadPriority), `absl::SetFlagByName`(존재 안 함) 등 *11개 실제
    API 이름 오류*를 잡았다. 이를 상시 gate로 정식화.

동작:
1. data/upstream-tracking.yaml 읽음 — 시리즈별 local clone·file_patterns·branch
2. 각 시리즈마다:
   a. Local clone 확보 (없으면 skip — freshness audit이 clone 담당)
   b. clone의 source 파일에서 *모든 식별자 토큰*을 한 번 인덱싱
      (subsystem_paths가 있으면 그 하위만 → linux 같은 거대 repo도 빠름)
   c. 시리즈 챕터에서 file_patterns의 *symbol 패턴*으로 인용 심볼 추출
      - `folly::Foo` → leaf `Foo` 존재 검사
      - `cxl_add_region` → 통째로 존재 검사
   d. 토큰 인덱스에 없는 심볼 = MISSING 후보 (rename·삭제·hallucination)
3. 시리즈별 whitelist(`cited_symbol_whitelist`)로 의도적 예외 제외
   (예: 버전 네임스페이스 `absl::lts_20240722`)

출력:
- 시리즈별 cited/missing 카운트 + MISSING 심볼의 챕터:line 위치

Exit code:
    0 = 모든 인용 심볼 존재 (또는 whitelist)
    2 = MISSING 후보 있음 (수동 review 필요; --strict면 1로 승격)

사용:
    python3 scripts/audit-cited-symbols.py
    python3 scripts/audit-cited-symbols.py --series folly
    python3 scripts/audit-cited-symbols.py --strict     # MISSING을 차단(exit 1)로
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

# clone에서 인덱싱할 source 확장자
_SOURCE_EXT = (".h", ".hpp", ".hh", ".cpp", ".cc", ".cxx", ".c", ".inl", ".ipp")

# 식별자 토큰
_IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def load_yaml(path):
    """yq CLI로 YAML → JSON (PyYAML 의존성 제거, freshness audit과 동일)."""
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


def is_symbol_pattern(pat):
    """file_patterns 중 *심볼* 패턴인지 판별.

    - `::` 포함 → namespaced 심볼 (folly::X, absl::X)
    - 경로 패턴(`/` + `\\.` 확장자)이면 아님
    - 그 외 identifier-prefix 패턴(cxl_[a-z_]+, pci_[a-z_]+)은 심볼로 취급
    """
    if "::" in pat:
        return True
    if "/" in pat and "\\." in pat:
        return False  # 파일 경로 패턴
    return True


def leaf_name(symbol):
    """`folly::small_vector` → small_vector, `cxl_add_region` → cxl_add_region."""
    return symbol.rsplit("::", 1)[-1]


def build_token_index(local_path, subsystem_paths=None):
    """clone의 source 파일에서 모든 식별자 토큰 set을 구축.

    subsystem_paths가 있으면 그 하위만 순회 (거대 repo 대비).
    """
    local = expand_path(local_path)
    roots = []
    if subsystem_paths:
        for sp in subsystem_paths:
            roots.append(local / sp)
    else:
        roots = [local]

    tokens = set()
    files_scanned = 0
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in _SOURCE_EXT:
                continue
            files_scanned += 1
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            tokens.update(_IDENT_RE.findall(text))
    return tokens, files_scanned


def extract_cited_symbols(series_dir, symbol_patterns):
    """시리즈 챕터에서 인용 심볼 추출.

    return: dict symbol -> list of (chapter_name, line_no)
    """
    series = expand_path(REPO_ROOT / series_dir)
    compiled = [re.compile(p) for p in symbol_patterns]
    cited = defaultdict(list)
    for chapter_md in sorted(series.glob("*.md")):
        if chapter_md.name == "STORYBOARD.md":
            continue
        try:
            lines = chapter_md.read_text(encoding="utf-8").splitlines()
        except Exception:
            continue
        for lineno, line in enumerate(lines, 1):
            for cp in compiled:
                for m in cp.finditer(line):
                    cited[m.group(0)].append((chapter_md.name, lineno))
    return cited


def audit_series(entry):
    """단일 시리즈 심볼 존재 audit."""
    title = entry["title"]
    series_dir = entry["series_dir"]
    upstream = entry["upstream"]
    local_path = upstream["local_path"]
    subsystem_paths = upstream.get("subsystem_paths") or None
    file_patterns = entry.get("file_patterns", [])
    whitelist = set(entry.get("cited_symbol_whitelist", []) or [])

    symbol_patterns = [p for p in file_patterns if is_symbol_pattern(p)]

    local = expand_path(local_path)
    if not local.exists():
        print(f"  SKIP {title}: clone 없음 ({local}) — freshness audit 먼저 실행",
              file=sys.stderr)
        return None

    tokens, files_scanned = build_token_index(local, subsystem_paths)
    cited = extract_cited_symbols(series_dir, symbol_patterns)

    missing = {}
    for sym, locs in cited.items():
        if sym in whitelist:
            continue
        if leaf_name(sym) not in tokens:
            missing[sym] = locs

    return {
        "id": entry["id"],
        "title": title,
        "files_scanned": files_scanned,
        "cited": len(cited),
        "missing": missing,
    }


def format_report(results):
    lines = ["# Cited-Symbol Existence Audit\n"]
    total_missing = 0
    for r in results:
        if r is None:
            continue
        lines.append(f"## {r['title']}")
        lines.append(f"- clone source files: {r['files_scanned']}, "
                     f"cited symbols: {r['cited']}, "
                     f"MISSING: {len(r['missing'])}")
        if r["missing"]:
            total_missing += len(r["missing"])
            for sym, locs in sorted(r["missing"].items()):
                where = ", ".join(f"{c}:{ln}" for c, ln in locs[:3])
                more = "" if len(locs) <= 3 else f" (+{len(locs)-3})"
                lines.append(f"    - `{sym}` — {where}{more}")
        else:
            lines.append("    ✓ 모든 인용 심볼이 upstream에 존재")
        lines.append("")
    lines.append(f"총 MISSING 후보: {total_missing}")
    lines.append("참고: 후보 = hallucination 아님. rename·삭제·오탈자·개념적 이름을 "
                 "사람이 확인. 의도적 예외는 tracking.yaml의 cited_symbol_whitelist로.")
    return "\n".join(lines), total_missing


def main():
    ap = argparse.ArgumentParser(description="Cited-symbol existence audit")
    ap.add_argument("--series", default=None, help="단일 시리즈 id로 제한")
    ap.add_argument("--strict", action="store_true",
                    help="MISSING 후보를 차단(exit 1)로 승격")
    ap.add_argument("--json", default=None, help="JSON 출력 경로")
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
            results.append(audit_series(entry))
        except Exception as e:
            print(f"ERROR auditing {entry['id']}: {e}", file=sys.stderr)
            import traceback; traceback.print_exc(file=sys.stderr)

    report, total_missing = format_report(results)
    print(report)

    if args.json:
        payload = [r for r in results if r is not None]
        with open(args.json, "w") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"\nJSON written: {args.json}", file=sys.stderr)

    if total_missing > 0:
        sys.exit(1 if args.strict else 2)


if __name__ == "__main__":
    main()
