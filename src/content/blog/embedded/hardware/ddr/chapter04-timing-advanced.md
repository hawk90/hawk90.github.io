---
title: "Ch 4: 고급 타이밍 — tRFC, tREFI, tWR, tWTR"
date: 2026-05-16T05:00:00
description: "DDR 메모리의 고급 타이밍 파라미터: Refresh, Write Recovery, Read-Write 전환 타이밍"
series: "DDR Memory Deep Dive"
seriesOrder: 4
tags: [DDR, memory, timing, refresh, write]
draft: true
---

기본 타이밍 외에도 시스템 안정성과 성능에 영향을 주는 타이밍 파라미터가 많다. 이 장에서는 Refresh 관련 타이밍과 Read/Write 전환 타이밍을 다룬다.

## tRFC (Refresh Cycle Time)

TODO: 내용 작성

- Refresh 명령 완료까지 걸리는 시간
- 메모리 용량에 비례하여 증가
- tRFC1, tRFC2, tRFC4 (DDR5)

## tREFI (Refresh Interval)

TODO: 내용 작성

- Refresh 명령 사이의 최대 간격
- 온도에 따른 조정
- Fine Granularity Refresh

## tWR (Write Recovery Time)

TODO: 내용 작성

- 마지막 Write 데이터 후 Precharge까지
- 데이터 완전 기록 보장
- Auto Precharge와의 관계

## tWTR (Write to Read Delay)

TODO: 내용 작성

- Write 후 Read까지의 최소 지연
- 같은 Bank vs 다른 Bank (tWTR_S, tWTR_L)
- 버스 터닝 시간

## tRTP (Read to Precharge)

TODO: 내용 작성

- Read 후 Precharge까지의 최소 지연
- 데이터 완전 출력 보장

## tFAW (Four Activate Window)

TODO: 내용 작성

- 연속 4개 ACTIVATE의 최소 시간 창
- 전력 제한 목적
- Bank Group과의 상호작용

## 정리

- tRFC는 Refresh에 소요되는 시간으로, 메모리 용량이 클수록 길다
- tREFI는 Refresh 간격으로, 데이터 유지의 핵심이다
- tWR은 Write 데이터가 셀에 완전히 기록되는 시간이다
- tWTR과 tRTP는 명령 전환 시의 버스 충돌을 방지한다
- tFAW는 전력 소모를 제한하기 위한 ACTIVATE 속도 제한이다

## 다음 장 예고

Chapter 5에서는 DDR 메모리의 초기화 시퀀스를 다룬다. Power-up부터 Mode Register 설정, ZQ Calibration까지 살펴본다.

## 관련 항목

- [Ch 3: 기본 타이밍](/blog/embedded/hardware/ddr/chapter03-timing-basic) — tCL, tRCD, tRP, tRAS
- [Ch 5: 초기화](/blog/embedded/hardware/ddr/chapter05-initialization) — Power-up, MRS, ZQ Cal
