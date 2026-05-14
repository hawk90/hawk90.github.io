---
title: "Ch 12: 리눅스 메모리 관리 — mm/, Page Allocator, NUMA"
date: 2026-08-01T13:00:00
description: "리눅스 커널의 메모리 관리: mm/ 서브시스템, Buddy Allocator, Zone, NUMA"
series: "DDR Memory Deep Dive"
seriesOrder: 12
tags: [DDR, Linux, kernel, memory, NUMA]
draft: true
---

리눅스 커널은 복잡한 메모리 관리 서브시스템을 갖추고 있다. 이 장에서는 물리 메모리 관리의 핵심인 mm/ 서브시스템을 DDR 관점에서 살펴본다.

## mm/ 서브시스템 개요

TODO: 내용 작성

- 물리 메모리와 가상 메모리
- struct page와 페이지 프레임
- 부팅 시 메모리 감지

## Zone

TODO: 내용 작성

- ZONE_DMA, ZONE_DMA32, ZONE_NORMAL, ZONE_HIGHMEM
- Zone의 목적과 제약
- /proc/zoneinfo

## Buddy Allocator

TODO: 내용 작성

- 2의 거듭제곱 크기 할당
- Free List 구조
- Fragmentation과 Compaction
- /proc/buddyinfo

## NUMA (Non-Uniform Memory Access)

TODO: 내용 작성

- 다중 소켓 시스템의 메모리 토폴로지
- Node, Distance Matrix
- Local vs Remote 접근 비용
- numactl, /sys/devices/system/node/

## 메모리 핫플러그

TODO: 내용 작성

- Memory Sections
- 온라인/오프라인 전환
- ACPI 기반 핫플러그
- /sys/devices/system/memory/

## 정리

- Linux mm/은 물리 메모리를 Zone과 Buddy Allocator로 관리한다
- Zone은 DMA 제약 등으로 메모리를 영역별로 구분한다
- Buddy Allocator는 2^n 단위로 연속 페이지를 할당한다
- NUMA 시스템에서는 메모리 접근 지역성이 성능에 큰 영향을 준다

## 다음 장 예고

Chapter 13에서는 리눅스 EDAC 서브시스템을 다룬다. 메모리 에러 리포팅과 RAS 기능을 살펴본다.

## 관련 항목

- [Ch 11: 컨트롤러](/blog/embedded/hardware/ddr/chapter11-controller) — Arbiter, Scheduler, Interleaving
- [Ch 13: 리눅스 EDAC](/blog/embedded/hardware/ddr/chapter13-linux-edac) — EDAC, 에러 리포팅
