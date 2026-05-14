---
title: "Ch 9: Physical Layer — LTSSM과 링크 트레이닝"
date: 2026-06-01T10:00:00
description: "PCIe Physical Layer — LTSSM 상태 머신, 링크 트레이닝, Equalization, 시그널링"
series: "PCIe Deep Dive"
seriesOrder: 9
tags: [pcie, physical-layer, ltssm, link-training, equalization]
draft: true
---

Physical Layer는 전기 신호를 통해 비트를 전송하고 링크를 관리한다. LTSSM(Link Training and Status State Machine)은 링크 초기화와 상태 전환을 제어한다.

## Physical Layer 개요

TODO: 내용 작성

- Electrical Sub-block
- Logical Sub-block
- 직렬 전송 (SerDes)
- 8b/10b, 128b/130b 인코딩

## 시그널링

TODO: 내용 작성

- Differential Signaling
- Gen1/2: 2.5/5.0 GT/s, NRZ
- Gen3/4/5: 8/16/32 GT/s, NRZ
- Gen6: 64 GT/s, PAM4
- Voltage Swing, Pre-emphasis

## LTSSM 개요

TODO: 내용 작성

- Link Training and Status State Machine
- 11개 주요 상태
- 상태 전환 조건
- Timeout과 에러 처리

## LTSSM 상태들

TODO: 내용 작성

- Detect: 링크 파트너 탐지
- Polling: 비트 동기화
- Configuration: Lane/Link 설정
- L0: 정상 동작
- Recovery: 에러 복구, 속도 변경
- L0s, L1, L2: 절전 상태
- Hot Reset, Loopback, Disable

## 링크 트레이닝

TODO: 내용 작성

- TS1/TS2 Ordered Sets
- Lane Polarity Inversion
- Lane Reversal
- Link Width Negotiation
- Speed Negotiation

## Equalization

TODO: 내용 작성

- Gen3+ 필수
- Transmitter Preset
- Receiver Preset
- Coefficient Optimization
- Phase 0/1/2/3

## Electrical Idle

TODO: 내용 작성

- EIEOS (Electrical Idle Exit Ordered Set)
- EIOS (Electrical Idle Ordered Set)
- 절전 상태 진입/탈출
- Squelch 회로

## 정리

- Physical Layer는 전기 신호 전송과 링크 관리를 담당한다
- LTSSM은 11개 상태로 링크 생명주기를 관리한다
- 링크 트레이닝으로 Lane, Width, Speed를 협상한다
- Gen3+ Equalization은 고속 전송의 신호 품질을 확보한다

## 다음 장 예고

[Chapter 10: Linux Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics)에서 Linux 커널의 PCIe 드라이버 프레임워크를 다룬다. pci_driver 구조체와 probe/remove를 살펴본다.

## 관련 항목

- [Chapter 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp)
- [Chapter 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management)
- [Chapter 10: Linux Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics)
