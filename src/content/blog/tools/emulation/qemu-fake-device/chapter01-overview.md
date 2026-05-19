---
title: "Ch 1: QEMU 개요 — 왜 가상 디바이스인가"
date: 2026-05-17T01:00:00
description: "QEMU로 가상 디바이스를 만들어 드라이버를 테스트하는 이유와 전체 워크플로우."
tags: [QEMU, Driver, Emulation, fake-device, fake-fpga]
series: "QEMU Fake Device Driver"
seriesOrder: 1
draft: true
---

Linux device driver 개발은 *실 hardware*가 있어야 시작할 수 있다는 통념이 있습니다. 그러나 QEMU에 *가상 device*를 만들면 *하드웨어 도착 전*에 driver의 대부분을 완성할 수 있죠. 이 시리즈 22장이 그 워크플로의 *전체 청사진*입니다.

## 어떤 문제를 푸는가

driver 개발 현장에서 자주 마주치는 문제.

| 어려움 | 결과 |
|--------|------|
| 하드웨어가 아직 없음 (HW팀 마감 후 시작) | driver 일정 지연 |
| 하드웨어가 비쌈 (PCIe 카드 ~수백만 원) | 팀원 한 명당 한 보드 불가능 |
| 하드웨어가 불안정 (prototype) | iteration cycle 느림 |
| 에러 주입 어려움 | corner case 검증 못 함 |
| CI 자동화 어려움 | 회귀 테스트 부재 |

QEMU의 *가상 device*가 이 모든 문제를 풉니다.

## QEMU의 핵심 가치 — driver 개발 관점

| 가치 | 의미 |
|------|------|
| **Custom device 가능** | C로 device model 작성. 어떤 register layout이든. |
| **재현 가능** | 같은 QEMU 버전이면 *결정적 동작* |
| **디버깅 용이** | GDB로 kernel + driver 단계별 |
| **에러 주입** | timeout·error response·race를 자유롭게 |
| **CI 친화** | GitHub Actions에서 *수분* 안에 |

## 전체 워크플로우

```text
1. QEMU device model 작성 (C)
   └── hw/misc/my_device.c

2. QEMU 빌드
   └── ./configure && make

3. Linux kernel + driver 빌드
   └── make M=drivers/my_driver

4. QEMU에서 VM 부팅
   └── qemu-system-x86_64 -device my_device ...

5. VM 안에서 driver 로드
   └── insmod my_driver.ko

6. 테스트 / 디버깅
   └── GDB attach, dmesg 확인

7. 반복
```

이 cycle이 *수 초~수 분*. 실 보드 cycle(*수 시간~수 일*)과 비교 불가능.

## 시리즈 구성

22장의 흐름.

| Ch 범위 | 주제 |
|---------|------|
| Ch 1~2 | 개요 + 빌드 환경 |
| Ch 3~5 | QOM · PCI device · MMIO register |
| Ch 6~7 | IRQ · DMA |
| Ch 8~9 | Linux driver · 디버깅 |
| Ch 10 | Test automation |
| Ch 11 | Advanced scenarios |
| Ch 12 | Case study — NVMe |
| Ch 13~14 | Register bank · scatter-gather DMA |
| Ch 15~16 | VirtIO basics · advanced |
| Ch 17 | Fuzzing |
| Ch 18 | Performance modeling |
| Ch 19~20 | Multi-function · Hotplug |
| Ch 21 | AER emulation |
| Ch 22 | Cross-architecture |

각 장이 *작은 device* 또는 *기능 하나*를 추가하며 점진적으로 *production-grade*에 도달.

## 누가 쓰나

| 도메인 | 사용 사례 |
|--------|----------|
| NPU vendor | accelerator driver 개발 |
| FPGA team | shell·user logic driver |
| Storage | NVMe·SCSI controller driver |
| Network | NIC·VirtIO driver |
| Education | driver 학습 |
| CI | mainline driver regression |

대부분의 *대형 driver 프로젝트*가 *어떤 형태로든* QEMU 가상 device를 사용.

## 한계 — QEMU가 못 하는 것

- *정확한 timing* — cycle-accurate가 아님 (driver-cosim에서 다룸)
- *Analog·PHY* — 외부 신호 부재
- *실 인터커넥트 latency* — 명목적 처리
- *Side channel* — 보안 분석 불가
- *Thermal·power* — 모사 안 함

QEMU는 *기능 검증*에 최적. *물리적 동작*은 실 보드 또는 cycle-accurate simulator 필요.

## 다른 인접 시리즈와의 관계

| 시리즈 | 무엇 다른가 |
|--------|------------|
| **QEMU Internals** | QEMU 자체의 내부 구조 |
| **QEMU RISC-V 심화** | RISC-V architecture 깊이 |
| **QEMU Embedded** | 임베디드 워크플로 |
| **FPGA Driver via QEMU+VFIO** | fake → 실 보드 4-step |
| **Driver-RTL Co-simulation** | pre-silicon cycle-accurate |

이 시리즈는 *가장 실용적인 driver 개발 입문*. 다른 시리즈로 *깊이* 확장.

## 정리

- QEMU는 *실 hardware 없이* driver 개발·테스트의 표준 도구.
- 워크플로: device model 작성 → QEMU 빌드 → kernel/driver 빌드 → VM 실행 → 디버깅.
- 가치: custom device·재현성·디버깅·에러 주입·CI.
- 22장으로 *PCI·MMIO·IRQ·DMA·VirtIO·NVMe* 등 모든 device 패턴 커버.
- NPU·FPGA·storage·network 모든 도메인에 적용.
- 한계: cycle-accurate 아님·analog 없음 — 실 보드 보완.

## 다음 장 예고

다음 장은 *환경 구축* — QEMU를 *소스에서 빌드*해 custom device 추가가 가능한 상태로.

## 관련 항목

- [Ch 2: QEMU 설치와 빌드](/blog/tools/emulation/qemu-fake-device/chapter02-install-build)
- [QEMU Internals](/blog/tools/emulation/qemu-internals/chapter01-architecture)
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge)
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim)
