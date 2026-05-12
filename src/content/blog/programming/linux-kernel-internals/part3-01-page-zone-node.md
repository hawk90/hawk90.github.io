---
title: "Part 3-1: 페이지 / zone / node"
date: 2026-07-17T01:00:00
description: "메모리 계층 — node (NUMA) → zone → page. struct page 자세히."
tags: [Linux, Kernel, Memory, NUMA, Page]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 11
draft: true
---

## 작성 중

### 예정 내용
- NUMA node — 메모리 친밀도
- zone — DMA / DMA32 / Normal / HighMem / Movable
- struct page — flags / mapping / private / _refcount
- 페이지 사이즈 (4KB / huge / gigantic)
- mem_map 배열
