---
title: "Ch 1: RISC-V 부트 시퀀스 개요"
date: 2025-05-18T19:00:00
description: "RISC-V 부트 시퀀스 — 리셋 벡터, 부트 단계, 책임 분리를 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 1
tags: [RISC-V, Boot, Reset-Vector, Firmware]
draft: true
---

## 개요

RISC-V 시스템의 부트 시퀀스를 이해한다.

---

## 리셋 벡터

TODO: 구현체마다 다름, 일반적으로 0x80000000 또는 0x1000

---

## 부트 단계

TODO:

```
리셋
  ↓
ROM/Mask ROM (선택적)
  ↓
ZSBL (Zero Stage Boot Loader)
  ↓
FSBL (First Stage Boot Loader) / OpenSBI
  ↓
U-Boot / 기타 부트로더
  ↓
Linux / RTOS / 베어메탈
```

---

## 각 단계의 책임

TODO:

| 단계 | 책임 |
|------|------|
| ROM | 최소 초기화, 다음 단계 로드 |
| ZSBL | DRAM 초기화 |
| OpenSBI | SBI 런타임, S-mode 진입 |
| U-Boot | 디바이스 초기화, 커널 로드 |

---

## M-mode vs S-mode vs U-mode

TODO: 부트 단계별 특권 모드

---

## 디바이스 트리 전달

TODO: a0 = hartid, a1 = DTB 포인터

---

## 정리

- 리셋 벡터는 구현체 정의
- 다단계 부트가 일반적
- OpenSBI가 M-mode 런타임 담당
- DTB로 하드웨어 정보 전달

---

## 다음 장 예고

Ch 2에서는 머신 모드 초기화를 다룬다.

---

## 참고 자료

- [OpenSBI Documentation](https://github.com/riscv-software-src/opensbi)
- RISC-V Privileged Spec
