---
title: "Ch 3: 기본 타이밍 — tCL, tRCD, tRP, tRAS"
date: 2026-05-16T04:00:00
description: "DDR 메모리의 핵심 타이밍 파라미터: CAS Latency, RAS to CAS Delay, Row Precharge, Row Active Time"
series: "DDR Memory Deep Dive"
seriesOrder: 3
tags: [DDR, memory, timing, latency, performance]
draft: true
---

메모리 스펙에서 흔히 보는 "16-18-18-36" 같은 숫자가 바로 타이밍 파라미터다. 이 장에서는 가장 기본적인 네 가지 타이밍—tCL, tRCD, tRP, tRAS—의 의미와 성능 영향을 다룬다.

## tCL (CAS Latency)

TODO: 내용 작성

- READ 명령 후 데이터가 나오기까지의 지연
- 클럭 사이클 단위
- 성능에 가장 직접적인 영향

## tRCD (RAS to CAS Delay)

TODO: 내용 작성

- ACTIVATE 후 READ/WRITE까지의 지연
- Row Buffer 로딩 시간
- Bank 접근 패턴과의 관계

## tRP (Row Precharge Time)

TODO: 내용 작성

- PRECHARGE 후 다음 ACTIVATE까지의 지연
- Row 전환 비용
- Page Miss 시나리오

## tRAS (Row Active Time)

TODO: 내용 작성

- Row가 열려 있어야 하는 최소 시간
- tRAS ≥ tRCD + tCL (대략적 관계)
- 전력 소모와의 관계

## 타이밍 표기법

TODO: 내용 작성

- DDR4-3200 CL16-18-18-36의 의미
- 절대 시간(ns) vs 클럭 사이클
- Speed Bin과 JEDEC 등급

## 타이밍 계산 예시

TODO: 내용 작성

- DDR4-3200에서 실제 지연 시간 계산
- 주파수별 tCL 비교
- 실효 대역폭 추정

## 정리

- tCL은 READ 명령 후 데이터 출력까지의 지연이다
- tRCD는 Row를 여는 데 걸리는 시간이다
- tRP는 Row를 닫는 데 걸리는 시간이다
- tRAS는 Row가 열려 있어야 하는 최소 시간이다
- 낮은 타이밍 = 빠른 응답, 단 안정성과 트레이드오프

## 다음 장 예고

Chapter 4에서는 고급 타이밍 파라미터를 다룬다. Refresh 관련 타이밍과 Write/Read 전환 타이밍을 살펴본다.

## 관련 항목

- [Ch 2: 명령어](/blog/embedded/hardware/ddr/chapter02-commands) — ACT, READ, WRITE, PRE, REF
- [Ch 4: 고급 타이밍](/blog/embedded/hardware/ddr/chapter04-timing-advanced) — tRFC, tREFI, tWR, tWTR
