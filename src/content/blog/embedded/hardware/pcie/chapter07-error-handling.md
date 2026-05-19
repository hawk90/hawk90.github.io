---
title: "Ch 7: Error Handling — AER"
date: 2026-05-16T08:00:00
description: "PCIe 에러 핸들링 — AER, Correctable/Uncorrectable 에러, 에러 로깅과 복구"
series: "PCIe Deep Dive"
seriesOrder: 7
tags: [pcie, error-handling, aer, correctable, uncorrectable]
draft: true
---

PCIe는 신뢰성 확보를 위해 계층별 에러 탐지와 복구 메커니즘을 제공한다. AER(Advanced Error Reporting)은 PCIe의 향상된 에러 보고 기능이다.

## 에러 분류

TODO: 내용 작성

- Correctable Error: 하드웨어가 자동 복구
- Uncorrectable Error: 소프트웨어 개입 필요
  - Non-Fatal: 트랜잭션 실패, 링크는 유지
  - Fatal: 링크 불안정, 재설정 필요

## AER Capability

TODO: 내용 작성

- Extended Capability (ID 0x0001)
- Uncorrectable Error Status/Mask/Severity
- Correctable Error Status/Mask
- Header Log
- Root Error Status/Command

## Correctable Errors

TODO: 내용 작성

- Receiver Error
- Bad TLP
- Bad DLLP
- Replay Timer Timeout
- Replay Num Rollover
- Advisory Non-Fatal Error

## Uncorrectable Errors

TODO: 내용 작성

- Data Link Protocol Error
- Surprise Down
- Poisoned TLP
- Flow Control Protocol Error
- Completion Timeout
- Completer Abort
- Unexpected Completion
- Malformed TLP
- ECRC Error
- Unsupported Request

## 에러 전파

TODO: 내용 작성

- Error Message (ERR_COR, ERR_NONFATAL, ERR_FATAL)
- Root Port로 전달
- System Error (SERR)
- NMI 또는 MCE

## 에러 복구

TODO: 내용 작성

- Link Retrain
- Function Level Reset (FLR)
- Hot Reset
- Secondary Bus Reset
- D3 Cycling

## Linux에서의 AER

TODO: 내용 작성

- `aer` 드라이버
- `/sys/bus/pci/devices/*/aer_*`
- `dmesg | grep -i aer`
- `pcie_aer=` 커널 파라미터

## 정리

- PCIe 에러는 Correctable과 Uncorrectable로 분류된다
- AER Capability는 상세한 에러 정보와 로깅을 제공한다
- Uncorrectable Error는 Non-Fatal과 Fatal로 세분화된다
- 에러 복구는 재시도, 리셋, 또는 디바이스 제거로 진행된다

## 다음 장 예고

[Chapter 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp)에서 Data Link Layer Packet의 구조와 역할을 다룬다. Ack/Nak, Flow Control, Replay Buffer를 살펴본다.

## 관련 항목

- [Chapter 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management)
- [Chapter 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp)
- [Chapter 14: Troubleshooting](/blog/embedded/hardware/pcie/chapter14-troubleshooting)
