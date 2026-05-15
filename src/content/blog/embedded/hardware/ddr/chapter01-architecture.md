---
title: "Ch 1: 아키텍처 — 셀, Bank, Row, Column, Rank"
date: 2026-08-01T02:00:00
description: "DDR 메모리의 물리적 구조: 메모리 셀부터 Bank, Row, Column, Rank까지의 계층 구조"
series: "DDR Memory Deep Dive"
seriesOrder: 1
tags: [DDR, memory, architecture, bank, rank]
draft: true
---

DDR 메모리의 성능을 이해하려면 물리적 구조부터 알아야 한다. 이 장에서는 메모리 셀의 동작 원리부터 Bank, Row, Column, Rank의 계층 구조까지 다룬다.

## 메모리 셀의 구조

TODO: 내용 작성

- 1T1C 구조 (1 Transistor, 1 Capacitor)
- 전하 저장과 리프레시 필요성
- Sense Amplifier의 역할

## Bank와 Bank Group

TODO: 내용 작성

- Bank의 정의와 병렬 접근
- Bank Group의 등장 (DDR4+)
- Bank Interleaving

## Row와 Column

TODO: 내용 작성

- Row Address와 Row Buffer
- Column Address와 Burst Access
- Page Hit, Page Miss, Page Empty

## Rank와 DIMM 구성

TODO: 내용 작성

- Rank의 정의 (64-bit/72-bit 데이터 폭)
- Single Rank vs Dual Rank
- DIMM 물리적 구성

## 주소 매핑

TODO: 내용 작성

- Physical Address → (Channel, Rank, Bank, Row, Column)
- 인터리빙 전략의 영향

## 정리

- 메모리 셀은 1T1C 구조로 주기적 리프레시가 필요하다
- Bank는 병렬 접근의 기본 단위다
- DDR4부터 Bank Group이 추가되어 연속 접근 성능이 향상되었다
- Row Buffer(Page)는 캐시처럼 동작하여 Page Hit 시 빠른 접근이 가능하다
- Rank는 동시에 접근되는 DRAM 칩의 그룹이다

## 다음 장 예고

Chapter 2에서는 DDR의 기본 명령어를 다룬다. ACTIVATE, READ, WRITE, PRECHARGE, REFRESH 명령이 어떻게 동작하는지 살펴본다.

## 관련 항목

- [Ch 2: 명령어](/blog/embedded/hardware/ddr/chapter02-commands) — ACT, READ, WRITE, PRE, REF
