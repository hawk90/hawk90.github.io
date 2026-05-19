---
title: "Ch 5: 초기화 — Power-up, MRS, ZQ Calibration"
date: 2026-05-16T06:00:00
description: "DDR 메모리 초기화 시퀀스: 전원 투입, Mode Register 설정, 임피던스 캘리브레이션"
series: "DDR Memory Deep Dive"
seriesOrder: 5
tags: [DDR, memory, initialization, MRS, calibration]
draft: true
---

DDR 메모리는 전원 투입 후 바로 사용할 수 없다. 정해진 초기화 시퀀스를 거쳐야 정상 동작한다. 이 장에서는 Power-up 시퀀스, Mode Register 설정, ZQ Calibration을 다룬다.

## Power-up 시퀀스

TODO: 내용 작성

- 전원 전압 안정화 (VDD, VDDQ, VPP)
- 클럭 안정화 (tCKstab)
- Reset 해제 타이밍
- CKE 활성화

## Mode Register Set (MRS)

TODO: 내용 작성

- MR0–MR6의 역할 (DDR4 기준)
- Burst Length, CAS Latency 설정
- Write Leveling 활성화
- DLL Reset

## ZQ Calibration

TODO: 내용 작성

- 출력 드라이버 임피던스 조정
- ZQ 핀과 외부 저항
- ZQCL (Long) vs ZQCS (Short)
- 온도 변화와 주기적 재보정

## 초기화 시퀀스 예시

TODO: 내용 작성

- DDR4 초기화 전체 흐름도
- 각 단계의 타이밍 요구사항
- 펌웨어 구현 시 주의점

## LPDDR 초기화 차이점

TODO: 내용 작성

- Boot Sequence 차이
- MRW (Mode Register Write) 명령
- FSP (Frequency Set Point)

## 정리

- DDR 초기화는 전원 안정화 → 클럭 안정화 → MRS → ZQ Cal 순서다
- Mode Register는 타이밍, 기능, 드라이버 설정을 담는다
- ZQ Calibration은 신호 품질을 위한 임피던스 매칭이다
- 초기화 실패는 메모리 인식 불가의 흔한 원인이다

## 다음 장 예고

Chapter 6에서는 Write Leveling을 다룬다. DQS와 CLK의 정렬이 왜 필요하고, 어떻게 수행되는지 살펴본다.

## 관련 항목

- [Ch 4: 고급 타이밍](/blog/embedded/hardware/ddr/chapter04-timing-advanced) — tRFC, tREFI, tWR, tWTR
- [Ch 6: Write Leveling](/blog/embedded/hardware/ddr/chapter06-write-leveling) — DQS-CLK 정렬
