---
title: "Ch 6: Write Leveling — DQS-CLK 정렬"
date: 2026-08-01T07:00:00
description: "DDR Write Leveling: DQS 스트로브와 CLK의 타이밍 정렬 원리와 구현"
series: "DDR Memory Deep Dive"
seriesOrder: 6
tags: [DDR, memory, training, write-leveling, timing]
draft: true
---

DDR3부터 도입된 Write Leveling은 DQS 스트로브와 CLK의 타이밍을 정렬하는 트레이닝 과정이다. PCB 배선 길이 차이로 인한 스큐를 보정하여 안정적인 Write 동작을 보장한다.

## Write Leveling이 필요한 이유

TODO: 내용 작성

- Fly-by Topology와 CLK 스큐
- DQS는 포인트 투 포인트, CLK는 직렬 연결
- DDR2까지는 T-Topology로 스큐 최소화

## Write Leveling 동작 원리

TODO: 내용 작성

- DRAM이 CLK 에지에서 DQS를 샘플링
- 샘플링 결과를 DQ로 피드백
- 컨트롤러가 DQS 지연 조정

## Write Leveling 시퀀스

TODO: 내용 작성

- MR1에서 Write Leveling Mode 활성화
- ODT 설정
- DQS 지연 조정 알고리즘
- 0→1 전환점 찾기

## 구현 시 고려사항

TODO: 내용 작성

- 초기 지연 값 설정
- 스텝 크기와 정밀도
- 온도 변화와 재트레이닝
- 여러 Rank 처리

## 디버깅

TODO: 내용 작성

- Write Leveling 실패 증상
- 오실로스코프로 확인
- 흔한 실패 원인

## 정리

- Write Leveling은 DQS와 CLK의 스큐를 보정한다
- DRAM이 CLK 에지에서 DQS를 샘플링하여 결과를 DQ로 반환한다
- 컨트롤러는 0→1 전환점을 찾아 DQS 지연을 설정한다
- Fly-by Topology에서는 Rank마다 다른 지연 값이 필요하다

## 다음 장 예고

Chapter 7에서는 Read Training을 다룬다. DQ/DQS Gate Training과 Bit Delay 조정 과정을 살펴본다.

## 관련 항목

- [Ch 5: 초기화](/blog/embedded/hardware/ddr/chapter05-initialization) — Power-up, MRS, ZQ Cal
- [Ch 7: Read Training](/blog/embedded/hardware/ddr/chapter07-read-training) — DQ/DQS Gate, Bit Delay
