---
title: "Part 3-3: slab / slub / slob"
date: 2026-05-12T13:00:00
description: "객체 캐시 할당자 — kmalloc 백엔드. 작은 객체 효율화."
tags: [Linux, Kernel, Memory, slab, kmalloc]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 13
draft: true
---

## 작성 중

### 예정 내용
- buddy로는 부족 — 작은 객체 (예: task_struct)
- slab — 객체 풀
- slub — 단순화 (현재 기본)
- slob — 임베디드 / 작은 시스템
- kmem_cache_create / kmem_cache_alloc
- kmalloc (size별 캐시) — slab 위에
