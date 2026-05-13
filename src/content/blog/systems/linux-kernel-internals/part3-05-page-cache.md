---
title: "Part 3-5: page cache"
date: 2025-07-17T05:00:00
description: "파일 시스템 캐시 — read / write 가속. address_space. write-back."
tags: [Linux, Kernel, Memory, Page Cache]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 15
---

## 작성 중

### 예정 내용
- address_space — 파일 → 페이지 매핑
- read — 캐시 hit / miss
- write — write-back / write-through
- dirty 페이지 / pdflush / writeback thread
- mmap과의 통합
- free 메모리에서 page cache 비율
