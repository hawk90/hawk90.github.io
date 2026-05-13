---
title: "Part 3-2: buddy allocator"
date: 2025-07-17T02:00:00
description: "물리 페이지 할당자 — 2^order 블록. fragmentation 회피."
tags: [Linux, Kernel, Memory, Buddy]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 12
draft: true
---

## 작성 중

### 예정 내용
- 2^order 블록 (0 ~ MAX_ORDER-1)
- 할당 / 해제 알고리즘
- buddy 병합 — 동일 order 인접
- per-CPU page list (PCP)
- migratype — UNMOVABLE / MOVABLE / RECLAIMABLE
- compaction
