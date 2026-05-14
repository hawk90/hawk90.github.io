---
title: "Ch 2: 명령어 — ACT, READ, WRITE, PRE, REF"
date: 2026-08-01T03:00:00
description: "DDR 메모리의 기본 명령어: ACTIVATE, READ, WRITE, PRECHARGE, REFRESH의 동작 원리"
series: "DDR Memory Deep Dive"
seriesOrder: 2
tags: [DDR, memory, commands, protocol]
draft: true
---

DDR 메모리 컨트롤러는 정해진 명령어 집합으로 DRAM과 통신한다. 이 장에서는 핵심 명령어인 ACTIVATE, READ, WRITE, PRECHARGE, REFRESH의 동작을 상세히 다룬다.

## ACTIVATE (ACT)

TODO: 내용 작성

- Row를 열고 Row Buffer에 로드
- Bank와 Row Address 지정
- tRCD 타이밍

## READ (RD)

TODO: 내용 작성

- Column Address로 데이터 읽기
- Burst Length와 데이터 전송
- tCL (CAS Latency)

## WRITE (WR)

TODO: 내용 작성

- Column Address로 데이터 쓰기
- Write Latency (tCWL)
- Write Recovery (tWR)

## PRECHARGE (PRE)

TODO: 내용 작성

- Row Buffer 닫기
- Per-Bank vs All-Bank Precharge
- tRP 타이밍

## REFRESH (REF)

TODO: 내용 작성

- 전하 유지를 위한 주기적 리프레시
- Auto Refresh vs Self Refresh
- tRFC와 tREFI

## 명령 시퀀스 예시

TODO: 내용 작성

- 전형적인 Read 시퀀스: ACT → RD → PRE
- Page Hit 최적화
- Bank Interleaving

## 정리

- ACTIVATE는 Row를 열어 Row Buffer에 로드한다
- READ/WRITE는 열린 Row에서 Column 단위로 데이터를 접근한다
- PRECHARGE는 Row Buffer를 닫아 다른 Row 접근을 준비한다
- REFRESH는 데이터 유지를 위해 주기적으로 수행된다
- 명령 간 타이밍 제약이 성능과 안정성을 결정한다

## 다음 장 예고

Chapter 3에서는 기본 타이밍 파라미터를 다룬다. tCL, tRCD, tRP, tRAS의 의미와 성능 영향을 분석한다.

## 관련 항목

- [Ch 1: 아키텍처](/blog/embedded/hardware/ddr/chapter01-architecture) — 셀, Bank, Row, Column, Rank
- [Ch 3: 기본 타이밍](/blog/embedded/hardware/ddr/chapter03-timing-basic) — tCL, tRCD, tRP, tRAS
