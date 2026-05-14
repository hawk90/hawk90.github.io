---
title: "Ch 8: DLLP — Data Link Layer Packet"
date: 2026-06-01T09:00:00
description: "DLLP 구조와 역할 — Ack/Nak, Flow Control, Replay Buffer, 신뢰성 보장"
series: "PCIe Deep Dive"
seriesOrder: 8
tags: [pcie, dllp, data-link-layer, flow-control, ack-nak]
draft: true
---

Data Link Layer는 Transaction Layer와 Physical Layer 사이에서 신뢰성 있는 전송을 보장한다. DLLP(Data Link Layer Packet)는 이 계층에서 사용하는 제어 패킷이다.

## Data Link Layer 개요

TODO: 내용 작성

- Transaction Layer로부터 TLP 수신
- 시퀀스 번호와 LCRC 추가
- 신뢰성 있는 전송 보장
- Physical Layer로 전달

## DLLP 종류

TODO: 내용 작성

- Ack DLLP
- Nak DLLP
- InitFC1 / InitFC2 / UpdateFC
- PM_Enter_L1 / PM_Enter_L23
- Vendor Specific DLLP

## Ack/Nak 프로토콜

TODO: 내용 작성

- TLP 시퀀스 번호
- Ack DLLP: 정상 수신 확인
- Nak DLLP: 재전송 요청
- LCRC 검증
- Replay Buffer

## Replay Buffer

TODO: 내용 작성

- TLP 임시 저장
- Nak 수신 시 재전송
- Replay Timer
- Replay Num (재시도 횟수)
- Buffer 크기와 성능

## Flow Control

TODO: 내용 작성

- Credit 기반 흐름 제어
- Posted, Non-Posted, Completion 크레딧
- Header Credit vs Data Credit
- InitFC (초기화)
- UpdateFC (크레딧 반환)

## Flow Control 초기화

TODO: 내용 작성

- FC_INIT1: 크레딧 공지
- FC_INIT2: 크레딧 확인
- DL_Up 상태 진입
- 핸드셰이크 완료

## LCRC

TODO: 내용 작성

- 32-bit CRC
- TLP 무결성 검증
- CRC 계산 범위
- 에러 탐지 능력

## 정리

- DLLP는 Data Link Layer의 제어 패킷이다
- Ack/Nak으로 TLP 전송 신뢰성을 보장한다
- Flow Control은 Credit 기반으로 수신 버퍼 오버플로우를 방지한다
- LCRC는 TLP 무결성을 검증한다

## 다음 장 예고

[Chapter 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 PCIe의 물리 계층을 다룬다. LTSSM, 링크 트레이닝, Equalization을 살펴본다.

## 관련 항목

- [Chapter 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)
- [Chapter 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)
- [Chapter 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer)
