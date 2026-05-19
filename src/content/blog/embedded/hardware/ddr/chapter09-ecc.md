---
title: "Ch 9: ECC — On-die ECC, Scrubbing"
date: 2026-05-16T10:00:00
description: "DDR 메모리의 ECC: ECC DIMM 구조, On-die ECC, Memory Scrubbing과 에러 정정"
series: "DDR Memory Deep Dive"
seriesOrder: 9
tags: [DDR, memory, ECC, reliability, scrubbing]
draft: true
---

메모리 에러는 우주선(cosmic ray)이나 전기적 노이즈로 발생할 수 있다. ECC(Error Correcting Code)는 이러한 에러를 감지하고 정정하여 시스템 신뢰성을 높인다.

## ECC DIMM 구조

TODO: 내용 작성

- 64-bit 데이터 + 8-bit ECC (72-bit 총 폭)
- SECDED (Single Error Correct, Double Error Detect)
- ECC 칩 배치

## ECC 동작 원리

TODO: 내용 작성

- Hamming Code 기반
- Write 시 ECC 비트 계산
- Read 시 신드롬 계산과 에러 정정
- CE (Correctable Error) vs UE (Uncorrectable Error)

## On-die ECC (ODECC)

TODO: 내용 작성

- DDR5에서 필수
- DRAM 칩 내부에서 ECC 수행
- 시스템 ECC와 독립적으로 동작
- 외부에서 에러 감지 불가 (투명)

## Memory Scrubbing

TODO: 내용 작성

- 주기적으로 메모리 읽고 재기록
- CE 누적 방지
- 백그라운드 vs 온디맨드 스크러빙
- 성능 영향

## 서버 환경의 고급 RAS

TODO: 내용 작성

- Chipkill / SDDC
- Rank Sparing
- Memory Mirroring
- Post Package Repair (PPR)

## 정리

- ECC DIMM은 72-bit 폭으로 SECDED를 지원한다
- On-die ECC는 DDR5에서 DRAM 내부에서 에러를 정정한다
- Memory Scrubbing은 CE 누적을 방지하여 UE를 예방한다
- 서버 환경에서는 Chipkill, Sparing, Mirroring 등 고급 RAS를 사용한다

## 다음 장 예고

Chapter 10에서는 전력 관리를 다룬다. Self-Refresh, Power-Down 모드와 저전력 기법을 살펴본다.

## 관련 항목

- [Ch 8: CA Training](/blog/embedded/hardware/ddr/chapter08-ca-training) — Command/Address (LPDDR)
- [Ch 10: 전력 관리](/blog/embedded/hardware/ddr/chapter10-power-management) — Self-Refresh, Power-Down
