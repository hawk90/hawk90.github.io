---
title: "Ch 11: 컨트롤러 — Arbiter, Scheduler, Interleaving"
date: 2026-08-01T12:00:00
description: "DDR 컨트롤러 아키텍처: 요청 중재, 명령 스케줄링, 주소 인터리빙 전략"
series: "DDR Memory Deep Dive"
seriesOrder: 11
tags: [DDR, memory, controller, scheduler, interleaving]
draft: true
---

DDR 컨트롤러는 CPU/버스의 메모리 요청을 받아 DRAM 명령으로 변환하고 스케줄링한다. 컨트롤러의 설계가 메모리 대역폭 활용률을 결정한다.

## 컨트롤러 블록 다이어그램

TODO: 내용 작성

- 프론트엔드: AXI/AHB 인터페이스
- 요청 큐와 리오더 버퍼
- 명령 스케줄러
- PHY 인터페이스

## Arbiter (중재기)

TODO: 내용 작성

- 다중 마스터의 요청 중재
- Round-Robin vs Priority-based
- QoS (Quality of Service) 지원
- 실시간 요청 우선순위

## Command Scheduler

TODO: 내용 작성

- 타이밍 제약 고려한 명령 순서 결정
- Page Hit 최적화
- Bank-level Parallelism
- Read/Write 그룹핑

## 주소 인터리빙

TODO: 내용 작성

- Channel Interleaving
- Rank Interleaving
- Bank/Bank Group Interleaving
- Row-Column 인터리빙 방식

## 성능 최적화 전략

TODO: 내용 작성

- Open Page vs Closed Page Policy
- Write Combining
- Read/Write 스위칭 최소화
- Refresh 스케줄링

## 정리

- DDR 컨트롤러는 요청 중재, 명령 스케줄링, 타이밍 관리를 담당한다
- Arbiter는 여러 마스터의 요청을 QoS 기반으로 중재한다
- Scheduler는 Bank Parallelism과 Page Hit를 최적화한다
- 주소 인터리빙은 대역폭을 균등하게 분산시킨다

## 다음 장 예고

Chapter 12에서는 리눅스 커널의 메모리 관리를 다룬다. mm/ 서브시스템, Page Allocator, NUMA를 살펴본다.

## 관련 항목

- [Ch 10: 전력 관리](/blog/embedded/hardware/ddr/chapter10-power-management) — Self-Refresh, Power-Down
- [Ch 12: 리눅스 메모리 관리](/blog/embedded/hardware/ddr/chapter12-linux-memory) — mm/, Page Allocator, NUMA
