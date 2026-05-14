---
title: "Ch 8: CA Training — Command/Address (LPDDR)"
date: 2026-08-01T09:00:00
description: "LPDDR의 CA Training: Command/Address 버스 타이밍 정렬과 신호 무결성"
series: "DDR Memory Deep Dive"
seriesOrder: 8
tags: [DDR, LPDDR, memory, training, command]
draft: true
---

LPDDR에서는 Command와 Address가 동일한 버스를 공유한다. CA Training은 이 CA 버스의 타이밍을 CLK에 정렬하는 과정이다.

## CA Training이 필요한 이유

TODO: 내용 작성

- LPDDR의 CA 버스 구조 (DDR과 다름)
- CLK 대비 CA 스큐
- 고속 동작에서의 타이밍 마진

## CA Training 동작 원리

TODO: 내용 작성

- DRAM이 CA 신호를 CLK 에지에서 샘플링
- CA Training Pattern 전송
- DRAM이 샘플링 결과를 DQ로 반환

## LPDDR4/5 CA Training 시퀀스

TODO: 내용 작성

- CBT (Command Bus Training) 모드 진입
- Pattern A/B 전송
- Rising/Falling Edge 정렬
- Per-Bit CA Deskew

## Vref Training

TODO: 내용 작성

- CA Vref 조정
- DRAM 내부 Vref 설정
- 최적 마진 찾기

## CA Training과 Write Leveling 비교

TODO: 내용 작성

| 항목 | Write Leveling | CA Training |
|------|----------------|-------------|
| 대상 | DQS-CLK | CA-CLK |
| 주 사용 | DDR3/4/5 | LPDDR3/4/5 |
| 샘플링 주체 | DRAM (DQS) | DRAM (CA) |
| 결과 반환 | DQ | DQ |

## 정리

- CA Training은 LPDDR의 Command/Address 버스 타이밍을 정렬한다
- DRAM이 CA 패턴을 샘플링하고 결과를 DQ로 반환한다
- LPDDR4/5에서는 Per-Bit CA Deskew까지 수행한다
- Vref Training으로 신호 마진을 최적화한다

## 다음 장 예고

Chapter 9에서는 ECC를 다룬다. ECC DIMM의 구조, On-die ECC, Memory Scrubbing을 살펴본다.

## 관련 항목

- [Ch 7: Read Training](/blog/embedded/hardware/ddr/chapter07-read-training) — DQ/DQS Gate, Bit Delay
- [Ch 9: ECC](/blog/embedded/hardware/ddr/chapter09-ecc) — ECC, On-die ECC, Scrubbing
