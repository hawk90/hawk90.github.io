---
title: "Ch 7: Read Training — DQ/DQS Gate, Bit Delay"
date: 2026-08-01T08:00:00
description: "DDR Read Training: DQS Gate Training, Read DQ 타이밍 조정, Bit별 Skew 보정"
series: "DDR Memory Deep Dive"
seriesOrder: 7
tags: [DDR, memory, training, read, timing]
draft: true
---

Read Training은 DRAM에서 나오는 DQS와 DQ 신호를 정확히 캡처하기 위한 트레이닝이다. DQS Gate Training과 Per-Bit Deskew가 핵심이다.

## Read Training이 필요한 이유

TODO: 내용 작성

- DRAM이 DQS/DQ를 구동 (Source Synchronous)
- 컨트롤러가 DQS로 DQ를 샘플링
- 배선/부품 편차로 인한 스큐

## DQS Gate Training

TODO: 내용 작성

- Read Preamble 감지
- Gate 열림/닫힘 타이밍
- Gate Pulse 폭 조정
- 잘못된 Gate로 인한 데이터 손상

## Read Leveling (DQ-DQS Centering)

TODO: 내용 작성

- DQ 아이 다이어그램 중심 찾기
- MPR (Multi-Purpose Register) 사용
- Known Pattern으로 결과 비교
- 최적 샘플링 포인트 결정

## Per-Bit Deskew

TODO: 내용 작성

- DQ 비트별 지연 차이
- Byte Lane 단위 vs Bit 단위
- 고속에서 더 중요해짐

## Read Training 알고리즘

TODO: 내용 작성

- 초기 지연 설정
- 스위프와 패스/페일 판정
- 마진 중심 찾기
- 결과 저장

## 정리

- DQS Gate Training은 DQS를 받아들일 타이밍 창을 설정한다
- Read Leveling은 DQ 샘플링의 최적 위치를 찾는다
- Per-Bit Deskew는 각 DQ 비트의 스큐를 개별 보정한다
- MPR 패턴을 이용해 Known Data로 트레이닝한다

## 다음 장 예고

Chapter 8에서는 CA Training을 다룬다. LPDDR에서 사용되는 Command/Address 신호 트레이닝을 살펴본다.

## 관련 항목

- [Ch 6: Write Leveling](/blog/embedded/hardware/ddr/chapter06-write-leveling) — DQS-CLK 정렬
- [Ch 8: CA Training](/blog/embedded/hardware/ddr/chapter08-ca-training) — Command/Address (LPDDR)
