---
title: "Ch 8: Memory Management (MEM)"
date: 2025-09-12T02:00:00
description: "malloc / free 함정 — double free / UAF / leak. realloc 안전."
tags: [CERT, Memory, malloc, UAF]
series: "CERT C"
seriesOrder: 8
draft: true
---

## 예정 내용
- MEM30 — freed 메모리 접근 X (UAF)
- MEM31 — heap 해제 — 한 번만 (no double free)
- MEM33 — 가변 크기 객체 alloc 회피
- MEM34 — 동적 할당된 메모리만 free
- MEM35 — sufficient memory 할당
- MEM36 — alignment 보존 (realloc)
- ASAN / MSAN으로 탐지
