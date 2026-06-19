#!/usr/bin/env python3
"""
audit-image-coverage.py — §11 접근성 자동화.

CLAUDE.md §11 신호 자동 탐지:
  - 추상 개념 키워드가 등장하는 챕터인데 이미지 0개 → *보강 후보*
  - 시리즈별 평균 이미지 수
  - Image-poor 챕터 ranking

추상 개념 키워드 — 기본 set은 systems/concurrency/distributed/ML 중심.
시리즈별로 *추가 키워드*를 yaml로 지정할 수도 있지만 일단 hardcoded.

출력:
  - 시리즈별 평균 이미지 수
  - Top N "이미지 부족 + 추상 개념" 챕터

Exit code: 항상 0 (informational)
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "src" / "content" / "blog"

# 추상 개념 키워드 — 이게 등장하는데 *그림이 없으면* 직관 약함
ABSTRACT_KEYWORDS = [
    # Concurrency
    "channel", "mutex", "spinlock", "futex", "semaphore",
    "actor", "mailbox", "STM", "transaction",
    "consensus", "Paxos", "Raft", "lease",
    "epoll", "io_uring", "select", "kqueue",
    # Memory
    "HAMT", "B-tree", "B+tree", "trie", "skiplist", "skip list",
    "page table", "TLB", "MMU", "IOMMU",
    "cache line", "DDIO", "NUMA",
    # OS / kernel
    "scheduler", "rt-mutex", "rcu", "RCU", "preempt",
    "interrupt", "softirq", "tasklet", "workqueue",
    # Networking / RDMA
    "RDMA", "DCB", "PFC", "QoS", "VLAN", "VXLAN",
    "TCP", "QUIC", "BGP",
    # GPU / parallel
    "SIMT", "NDRange", "warp", "wavefront", "kernel launch",
    "tensor", "TPU", "compute graph",
    # Distributed
    "sharding", "replica", "leader election", "epoch",
    "quorum", "vector clock", "Lamport",
    # Hardware
    "FLIT", "lane", "differential pair", "Gen6", "PAM4",
    "HBM", "stack", "interposer",
    "NoC", "mesh", "ring bus",
]

# Image 카운트 — markdown image syntax + html img tag + TikZ SVG path
IMAGE_PATTERNS = [
    re.compile(r"!\[[^\]]*\]\([^)]+\)"),       # ![alt](url)
    re.compile(r"<img\s+[^>]*src=", re.IGNORECASE),  # <img src=
    re.compile(r"/images/blog/[^)\s\"']+"),    # bare path reference
]


def count_images(text):
    """이미지 reference 수 (대략적 — 중복 카운트 가능, 우선순위용)."""
    n = 0
    for p in IMAGE_PATTERNS:
        n += len(p.findall(text))
    return n


def count_abstract_keywords(text):
    """추상 개념 키워드 occurrence 수 (대소문자 무시는 키워드 케이스에 따라)."""
    hits = []
    for kw in ABSTRACT_KEYWORDS:
        # 단어 경계 — 영어 keyword
        pattern = r"\b" + re.escape(kw) + r"\b"
        flags = re.IGNORECASE if kw.islower() else 0
        matches = re.findall(pattern, text, flags)
        if matches:
            hits.append((kw, len(matches)))
    return hits


def get_series(text):
    """frontmatter에서 series 이름·draft 추출."""
    if not text.startswith("---"):
        return None, False
    end = text.find("\n---", 4)
    if end < 0:
        return None, False
    fm = text[3:end]
    series = None
    draft = False
    for line in fm.splitlines():
        line = line.strip()
        m = re.match(r'^series:\s*"?([^"]+)"?$', line)
        if m:
            series = m.group(1).strip()
        m = re.match(r'^draft:\s*(true|false)$', line)
        if m:
            draft = m.group(1) == "true"
    return series, draft


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=20,
                    help="이미지 부족 챕터 상위 N개")
    ap.add_argument("--min-keywords", type=int, default=3,
                    help="추상 키워드 N개 이상인데 이미지 0개인 챕터만")
    ap.add_argument("--include-drafts", action="store_true",
                    help="draft도 포함 (기본은 published만)")
    ap.add_argument("--json", help="JSON 출력 경로")
    args = ap.parse_args()

    series_stats = defaultdict(lambda: {"chapters": 0, "images": 0})
    candidates = []  # 보강 후보

    for md in CONTENT_DIR.rglob("*.md"):
        if md.name in ("STORYBOARD.md", "README.md"):
            continue
        try:
            text = md.read_text(encoding="utf-8")
        except Exception:
            continue
        series, draft = get_series(text)
        if not series:
            continue
        if draft and not args.include_drafts:
            continue

        imgs = count_images(text)
        kws = count_abstract_keywords(text)
        n_kw = sum(c for _, c in kws)

        series_stats[series]["chapters"] += 1
        series_stats[series]["images"] += imgs

        # 보강 후보: 이미지 0개 + 추상 키워드 ≥ min
        if imgs == 0 and n_kw >= args.min_keywords:
            candidates.append({
                "path": str(md.relative_to(REPO_ROOT)),
                "series": series,
                "images": imgs,
                "keyword_count": n_kw,
                "top_keywords": sorted(kws, key=lambda x: -x[1])[:5],
            })

    # Ranking — 키워드 많은 순
    candidates.sort(key=lambda c: -c["keyword_count"])

    # 텍스트 리포트
    print("=== Image Coverage Audit ===")
    print(f"  Total series: {len(series_stats)}")
    print(f"  Candidates (image=0, keyword≥{args.min_keywords}): {len(candidates)}")
    print()

    print("=== 시리즈별 평균 이미지 ===")
    rows = []
    for s, d in series_stats.items():
        avg = d["images"] / d["chapters"] if d["chapters"] else 0
        rows.append((s, d["chapters"], d["images"], avg))
    rows.sort(key=lambda r: r[3])  # 평균 적은 순
    for s, n_ch, n_img, avg in rows[:15]:
        print(f"  {avg:5.2f} img/ch  {n_ch:3d}편  {n_img:4d}개  {s}")
    print(f"  ... ({len(rows) - 15} more)" if len(rows) > 15 else "")
    print()

    print(f"=== Top {args.top} 보강 후보 (이미지=0, 키워드 많은 순) ===")
    for c in candidates[:args.top]:
        kw_str = ", ".join(f"{k}×{n}" for k, n in c["top_keywords"])
        print(f"  [{c['keyword_count']:3d} kw] {c['path']}")
        print(f"         keywords: {kw_str}")

    if args.json:
        with open(args.json, "w") as f:
            json.dump({
                "series_stats": {s: d for s, d in series_stats.items()},
                "candidates": candidates,
            }, f, indent=2, ensure_ascii=False)

    sys.exit(0)


if __name__ == "__main__":
    main()
