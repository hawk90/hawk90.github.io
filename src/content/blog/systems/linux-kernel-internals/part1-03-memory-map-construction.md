---
title: "Part 1-3: 메모리 맵 구성"
slug: "systems/linux-kernel-internals/part1-03-memory-map-construction"
date: 2026-05-12T03:00:00
description: "E820 / DTB → 물리 메모리 맵. memblock → buddy 전환."
tags: [Linux, Kernel, memory-map, memblock]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 3
draft: true
topics: ["systems", "systems/linux-kernel"]
---

## 작성 중

### 예정 내용
- BIOS E820 / UEFI memory map
- Device Tree (ARM/임베디드) memory node
- memblock — 부팅 시 메모리 관리자
- node / zone 분할 (DMA / Normal / HighMem)
- buddy allocator로 전환
