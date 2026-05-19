---
title: "Ch 14: DDR5 — 듀얼 채널, DFE, 향상된 RAS"
date: 2026-05-16T15:00:00
description: "DDR5의 새로운 기능: DIMM 내 듀얼 채널, Decision Feedback Equalization, On-die ECC"
series: "DDR Memory Deep Dive"
seriesOrder: 14
tags: [DDR, DDR5, memory, DFE, RAS]
draft: true
---

DDR5는 DDR4 대비 대역폭, 전력 효율, 신뢰성에서 큰 도약을 이뤘다. 이 장에서는 DDR5의 주요 변화와 새로운 기능을 DDR4와 비교하며 살펴본다.

## DDR5 vs DDR4 주요 차이

TODO: 내용 작성

| 항목 | DDR4 | DDR5 |
|------|------|------|
| 데이터 레이트 | 1600–3200 MT/s | 3200–8400 MT/s |
| 프리페치 | 8n | 16n |
| 버스트 길이 | BL8 | BL16 |
| 채널 | 1×64b | 2×32b |
| VDD | 1.2V | 1.1V |
| On-die ECC | 없음 | 필수 |

## DIMM 내 듀얼 채널

TODO: 내용 작성

- 64-bit → 2×32-bit 독립 채널
- 채널당 독립 명령/주소
- 병렬성 증가
- 대역폭 활용률 향상

## On-die ECC

TODO: 내용 작성

- DRAM 칩 내부 ECC (128-bit → 136-bit)
- Single-bit 에러 내부 정정
- 시스템 ECC와 중첩 가능
- 투명 동작 (외부에서 에러 불가시)

## Decision Feedback Equalization (DFE)

TODO: 내용 작성

- 채널 ISI (Inter-Symbol Interference) 보상
- 고속 신호 무결성 향상
- Training 복잡도 증가

## Power Management IC (PMIC)

TODO: 내용 작성

- 전압 레귤레이터 DIMM 내장
- 12V 입력 → 1.1V VDD
- Thermal Sensor 통합

## Same Bank Refresh

TODO: 내용 작성

- Bank Group 단위 리프레시
- 다른 Bank 접근 가능
- tRFC 영향 완화

## 정리

- DDR5는 듀얼 채널로 대역폭과 병렬성이 향상되었다
- On-die ECC는 필수로, DRAM 내부에서 단일 비트 에러를 정정한다
- DFE는 고속 신호의 ISI를 보상하여 Eye Margin을 확보한다
- PMIC가 DIMM에 내장되어 전력 효율이 개선되었다

## 다음 장 예고

Chapter 15에서는 메모리 디버깅 실무를 다룬다. 메모리 인식 불가, 트레이닝 실패, ECC 에러 사례를 살펴본다.

## 관련 항목

- [Ch 13: 리눅스 EDAC](/blog/embedded/hardware/ddr/chapter13-linux-edac) — EDAC, 에러 리포팅
- [Ch 15: 디버깅](/blog/embedded/hardware/ddr/chapter15-debugging) — 메모리 안 뜸, 트레이닝 실패, ECC 에러
